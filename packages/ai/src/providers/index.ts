import type { AiConfig, AiProvider } from '../types.js';
import { ClaudeCodeProvider } from './claude-code.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAiProvider } from './openai.js';
import { OllamaProvider } from './ollama.js';

export function createProvider(config: AiConfig): AiProvider {
  switch (config.provider) {
    case 'claude-code':
      return new ClaudeCodeProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'openai':
      return new OpenAiProvider(config);
    case 'ollama':
      return new OllamaProvider(config);
  }
}

export { ClaudeCodeProvider, AnthropicProvider, OpenAiProvider, OllamaProvider };
