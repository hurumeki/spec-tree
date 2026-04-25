import { spawn } from 'node:child_process';
import type { AiProvider, AiRequest, AiResponse, ClaudeCodeConfig } from '../types.js';

// Default invocation: pipe the rendered prompt through `claude -p` (Claude
// Code CLI's non-interactive mode). Override the command/args via config or
// AI_CLAUDE_CODE_COMMAND for tests and alternative shells.
const DEFAULT_COMMAND = 'claude';
const DEFAULT_ARGS = ['-p'];

export class ClaudeCodeProvider implements AiProvider {
  readonly id = 'claude-code' as const;
  readonly model: string | undefined;
  private readonly command: string;
  private readonly args: string[];

  constructor(config: ClaudeCodeConfig) {
    this.model = config.model;
    this.command = config.command ?? DEFAULT_COMMAND;
    this.args = config.args ?? DEFAULT_ARGS;
  }

  run(request: AiRequest): Promise<AiResponse> {
    return new Promise((resolvePromise, rejectPromise) => {
      const child = spawn(this.command, this.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        signal: request.signal,
      });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
      child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
      child.on('error', rejectPromise);
      child.on('close', (code) => {
        if (code !== 0) {
          const errText = Buffer.concat(stderr).toString('utf8').trim();
          rejectPromise(
            new Error(
              `claude-code provider exited with code ${code}${errText ? `: ${errText}` : ''}`,
            ),
          );
          return;
        }
        resolvePromise({
          text: Buffer.concat(stdout).toString('utf8'),
          providerId: this.id,
          model: this.model,
        });
      });
      child.stdin.end(request.prompt, 'utf8');
    });
  }
}
