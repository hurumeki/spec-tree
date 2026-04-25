import type { AiProvider, AiRequest, AiResponse, OllamaConfig } from '../types.js';

const SYSTEM_INSTRUCTION =
  'You output JSON only. Do not wrap output in code fences or add any commentary.';

interface OllamaGenerateResponse {
  response: string;
  model?: string;
}

export class OllamaProvider implements AiProvider {
  readonly id = 'ollama' as const;
  readonly model: string;
  private readonly baseUrl: string;

  constructor(config: OllamaConfig) {
    this.model = config.model ?? 'llama3.1';
    this.baseUrl = (config.baseUrl ?? 'http://127.0.0.1:11434').replace(/\/+$/, '');
  }

  async run(request: AiRequest): Promise<AiResponse> {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      signal: request.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        system: SYSTEM_INSTRUCTION,
        prompt: request.prompt,
        format: 'json',
        stream: false,
      }),
    });
    if (!res.ok) {
      throw new Error(`ollama API error ${res.status}: ${await res.text()}`);
    }
    const body = (await res.json()) as OllamaGenerateResponse;
    if (!body.response) {
      throw new Error('ollama API returned no response text');
    }
    return { text: body.response, providerId: this.id, model: body.model ?? this.model };
  }
}
