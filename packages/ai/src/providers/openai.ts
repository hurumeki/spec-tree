import type { AiProvider, AiRequest, AiResponse, OpenAiConfig } from '../types.js';

const DEFAULT_BASE = 'https://api.openai.com';
const SYSTEM_INSTRUCTION =
  'You output JSON only. Do not wrap output in code fences or add any commentary.';

interface OpenAiChatResponse {
  choices: Array<{ message?: { content?: string } }>;
  model?: string;
}

export class OpenAiProvider implements AiProvider {
  readonly id = 'openai' as const;
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxTokens: number;

  constructor(config: OpenAiConfig) {
    if (!config.apiKey) {
      throw new Error('openai provider requires AI_API_KEY (OpenAI API key)');
    }
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'gpt-4o-mini';
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE).replace(/\/+$/, '');
    this.maxTokens = config.maxTokens ?? 8192;
  }

  async run(request: AiRequest): Promise<AiResponse> {
    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      signal: request.signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_INSTRUCTION },
          { role: 'user', content: request.prompt },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`openai API error ${res.status}: ${await res.text()}`);
    }
    const body = (await res.json()) as OpenAiChatResponse;
    const text = body.choices[0]?.message?.content ?? '';
    if (!text) {
      throw new Error('openai API returned no text content');
    }
    return { text, providerId: this.id, model: body.model ?? this.model };
  }
}
