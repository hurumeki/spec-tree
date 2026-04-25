import type { AiProvider, AiRequest, AiResponse, AnthropicConfig } from '../types.js';

const DEFAULT_BASE = 'https://api.anthropic.com';
const API_VERSION = '2023-06-01';
const SYSTEM_INSTRUCTION =
  'You output JSON only. Do not wrap output in code fences or add any commentary.';

interface AnthropicMessageResponse {
  content: Array<{ type: string; text?: string }>;
  model?: string;
}

export class AnthropicProvider implements AiProvider {
  readonly id = 'anthropic' as const;
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxTokens: number;

  constructor(config: AnthropicConfig) {
    if (!config.apiKey) {
      throw new Error('anthropic provider requires AI_API_KEY (Anthropic API key)');
    }
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'claude-sonnet-4-6';
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE).replace(/\/+$/, '');
    this.maxTokens = config.maxTokens ?? 8192;
  }

  async run(request: AiRequest): Promise<AiResponse> {
    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      signal: request.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        system: SYSTEM_INSTRUCTION,
        messages: [{ role: 'user', content: request.prompt }],
      }),
    });
    if (!res.ok) {
      throw new Error(`anthropic API error ${res.status}: ${await res.text()}`);
    }
    const body = (await res.json()) as AnthropicMessageResponse;
    const text = body.content
      .filter((part) => part.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text!)
      .join('');
    if (!text) {
      throw new Error('anthropic API returned no text content');
    }
    return { text, providerId: this.id, model: body.model ?? this.model };
  }
}
