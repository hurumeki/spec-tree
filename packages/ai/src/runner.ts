import type { AiConfig, AiResponse } from './types.js';
import { createProvider } from './providers/index.js';
import { ensureIsoTimestamp, parseJson } from './postprocess.js';

export interface RunPromptOptions {
  prompt: string;
  config: AiConfig;
  signal?: AbortSignal;
  now?: () => Date;
}

export interface RunPromptResult {
  json: unknown;
  raw: string;
  response: AiResponse;
}

export async function runPrompt(options: RunPromptOptions): Promise<RunPromptResult> {
  const provider = createProvider(options.config);
  const response = await provider.run({ prompt: options.prompt, signal: options.signal });
  const parsed = parseJson(response.text);
  const withTimestamp = ensureIsoTimestamp(parsed, options.now?.() ?? new Date());
  return { json: withTimestamp, raw: response.text, response };
}
