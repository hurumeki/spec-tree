#!/usr/bin/env node
// spec-tree-ai CLI — read a fully-rendered prompt from stdin (or --prompt-file
// + --payload-file), run it through the configured AI provider, validate the
// JSON output, and write it atomically to --out (or stdout).
//
// Usage:
//   spec-tree-ai run [--out <path>]
//                    [--prompt-file <path>] [--payload-file <path>]
//                    [--provider <id>] [--model <name>]
//                    [--config <ai.config.json>]
//
// Provider selection precedence: CLI flag > AI_PROVIDER env > config file >
// "claude-code" default. See packages/ai/README — or docs/04-ai-processing.md.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { loadConfig, type LoadConfigOptions } from './config.js';
import { runPrompt } from './runner.js';
import type { ProviderId } from './types.js';

type ConfigOverrides = NonNullable<LoadConfigOptions['overrides']>;

interface CliArgs {
  command: string;
  out?: string;
  promptFile?: string;
  payloadFile?: string;
  provider?: ProviderId;
  model?: string;
  configPath?: string;
  help?: boolean;
}

const HELP = `spec-tree-ai — provider-agnostic AI runner for spec-tree CLI prompts.

Usage:
  spec-tree-ai run [options]

Options:
  --out <path>            Write validated JSON to <path> atomically (default: stdout).
  --prompt-file <path>    Read prompt template from <path> instead of stdin.
  --payload-file <path>   Read payload from <path>; concatenated after the prompt.
  --provider <id>         Override provider (claude-code | anthropic | openai | ollama).
  --model <name>          Override model name.
  --config <path>         Load provider config from <path> (JSON).
  -h, --help              Show this message.

Environment:
  AI_PROVIDER, AI_MODEL, AI_API_KEY, AI_BASE_URL, AI_MAX_TOKENS,
  AI_CLAUDE_CODE_COMMAND, AI_CONFIG_PATH.

If neither --prompt-file nor --payload-file is given, the entire stdin is used
as the rendered prompt (matches the legacy run-claude.sh behavior).
`;

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { command: argv[0] ?? '' };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    const next = (): string => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`missing value for ${a}`);
      return v;
    };
    switch (a) {
      case '--out':
        args.out = next();
        break;
      case '--prompt-file':
        args.promptFile = next();
        break;
      case '--payload-file':
        args.payloadFile = next();
        break;
      case '--provider':
        args.provider = next() as ProviderId;
        break;
      case '--model':
        args.model = next();
        break;
      case '--config':
        args.configPath = next();
        break;
      case '-h':
      case '--help':
        args.help = true;
        break;
      default:
        throw new Error(`unknown argument: ${a}`);
    }
  }
  return args;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function buildPrompt(args: CliArgs): Promise<string> {
  if (args.promptFile) {
    const tmpl = await readFile(resolve(args.promptFile), 'utf8');
    if (args.payloadFile) {
      const payload = await readFile(resolve(args.payloadFile), 'utf8');
      return `${tmpl}\n\n---\n\n${payload}`;
    }
    if (!process.stdin.isTTY) {
      const stdin = await readStdin();
      if (stdin.length > 0) return `${tmpl}\n\n---\n\n${stdin}`;
    }
    return tmpl;
  }
  return readStdin();
}

async function atomicWriteJson(path: string, json: unknown): Promise<void> {
  const abs = resolve(path);
  await mkdir(dirname(abs), { recursive: true });
  const tmp = `${abs}.tmp`;
  await writeFile(tmp, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  await rename(tmp, abs);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.command) {
    process.stdout.write(HELP);
    return;
  }
  if (args.command !== 'run') {
    throw new Error(`unknown command: ${args.command}`);
  }
  const overrides: ConfigOverrides = {};
  if (args.provider) overrides.provider = args.provider;
  if (args.model) overrides.model = args.model;
  const config = await loadConfig({
    configPath: args.configPath,
    overrides,
  });
  const prompt = await buildPrompt(args);
  if (!prompt.trim()) {
    throw new Error('prompt is empty (no stdin / --prompt-file)');
  }
  process.stderr.write(`[ai] provider=${config.provider} model=${config.model ?? '(default)'}\n`);
  const result = await runPrompt({ prompt, config });
  if (args.out) {
    await atomicWriteJson(args.out, result.json);
    process.stderr.write(`[ai] wrote ${args.out}\n`);
  } else {
    process.stdout.write(`${JSON.stringify(result.json, null, 2)}\n`);
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[ai] error: ${msg}\n`);
  process.exit(1);
});
