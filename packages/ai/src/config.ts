import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { AiConfig, ProviderId } from './types.js';

const ProviderIdSchema = z.enum(['claude-code', 'anthropic', 'openai', 'ollama']);

const ConfigFileSchema = z.object({
  provider: ProviderIdSchema.optional(),
  model: z.string().optional(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  maxTokens: z.number().int().positive().optional(),
});

type ConfigFile = z.infer<typeof ConfigFileSchema>;

const DEFAULT_PROVIDER: ProviderId = 'claude-code';

export interface LoadConfigOptions {
  configPath?: string;
  env?: NodeJS.ProcessEnv;
  overrides?: Partial<ConfigFile> & { provider?: ProviderId };
}

export async function loadConfig(options: LoadConfigOptions = {}): Promise<AiConfig> {
  const env = options.env ?? process.env;
  const fromFile = await readConfigFile(options.configPath, env);
  const fromEnv = readEnv(env);
  const merged: ConfigFile = {
    ...fromFile,
    ...stripUndefined(fromEnv),
    ...stripUndefined(options.overrides ?? {}),
  };
  const provider = (merged.provider ?? DEFAULT_PROVIDER) as ProviderId;
  return assemble(provider, merged);
}

async function readConfigFile(
  configPath: string | undefined,
  env: NodeJS.ProcessEnv,
): Promise<ConfigFile> {
  const path = configPath ?? env.AI_CONFIG_PATH;
  if (!path) return {};
  const abs = resolve(process.cwd(), path);
  let raw: string;
  try {
    raw = await readFile(abs, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw err;
  }
  const parsed = JSON.parse(raw) as unknown;
  return ConfigFileSchema.parse(parsed);
}

function readEnv(env: NodeJS.ProcessEnv): ConfigFile {
  const provider = env.AI_PROVIDER ? ProviderIdSchema.parse(env.AI_PROVIDER) : undefined;
  const maxTokens = env.AI_MAX_TOKENS ? Number.parseInt(env.AI_MAX_TOKENS, 10) : undefined;
  return {
    provider,
    model: env.AI_MODEL,
    apiKey: env.AI_API_KEY,
    baseUrl: env.AI_BASE_URL,
    command: env.AI_CLAUDE_CODE_COMMAND,
    maxTokens: Number.isFinite(maxTokens) ? maxTokens : undefined,
  };
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

function assemble(provider: ProviderId, c: ConfigFile): AiConfig {
  switch (provider) {
    case 'claude-code':
      return {
        provider,
        model: c.model,
        command: c.command,
        args: c.args,
      };
    case 'anthropic':
      return {
        provider,
        model: c.model ?? 'claude-sonnet-4-6',
        apiKey: c.apiKey,
        baseUrl: c.baseUrl,
        maxTokens: c.maxTokens ?? 8192,
      };
    case 'openai':
      return {
        provider,
        model: c.model ?? 'gpt-4o-mini',
        apiKey: c.apiKey,
        baseUrl: c.baseUrl,
        maxTokens: c.maxTokens ?? 8192,
      };
    case 'ollama':
      return {
        provider,
        model: c.model ?? 'llama3.1',
        baseUrl: c.baseUrl ?? 'http://127.0.0.1:11434',
      };
  }
}
