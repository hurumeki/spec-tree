// Provider-agnostic AI execution interface used by the spec-tree CLI workflow.
//
// Each provider receives a fully-rendered prompt (the prompt template + payload
// already concatenated upstream) and must return raw text. The caller is
// responsible for post-processing (fence stripping, JSON parsing, schema
// validation) so providers stay thin.

export type ProviderId = 'claude-code' | 'anthropic' | 'openai' | 'ollama';

export interface AiRequest {
  prompt: string;
  signal?: AbortSignal;
}

export interface AiResponse {
  text: string;
  providerId: ProviderId;
  model?: string;
}

export interface AiProvider {
  readonly id: ProviderId;
  readonly model: string | undefined;
  run(request: AiRequest): Promise<AiResponse>;
}

export interface ProviderConfigBase {
  provider: ProviderId;
  model?: string;
}

export interface ClaudeCodeConfig extends ProviderConfigBase {
  provider: 'claude-code';
  command?: string;
  args?: string[];
}

export interface AnthropicConfig extends ProviderConfigBase {
  provider: 'anthropic';
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
}

export interface OpenAiConfig extends ProviderConfigBase {
  provider: 'openai';
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
}

export interface OllamaConfig extends ProviderConfigBase {
  provider: 'ollama';
  baseUrl?: string;
}

export type AiConfig = ClaudeCodeConfig | AnthropicConfig | OpenAiConfig | OllamaConfig;
