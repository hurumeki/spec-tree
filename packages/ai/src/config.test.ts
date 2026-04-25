import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('defaults to claude-code with no env or file', async () => {
    const cfg = await loadConfig({ env: {} });
    expect(cfg.provider).toBe('claude-code');
  });

  it('honors AI_PROVIDER env', async () => {
    const cfg = await loadConfig({
      env: { AI_PROVIDER: 'openai', AI_API_KEY: 'sk-test', AI_MODEL: 'gpt-4o' },
    });
    expect(cfg.provider).toBe('openai');
    expect(cfg.model).toBe('gpt-4o');
    if (cfg.provider === 'openai') expect(cfg.apiKey).toBe('sk-test');
  });

  it('reads provider from a JSON config file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ai-config-'));
    const path = join(dir, 'ai.config.json');
    await writeFile(
      path,
      JSON.stringify({ provider: 'anthropic', model: 'claude-sonnet-4-6', apiKey: 'sk-a' }),
    );
    const cfg = await loadConfig({ configPath: path, env: {} });
    expect(cfg.provider).toBe('anthropic');
    if (cfg.provider === 'anthropic') {
      expect(cfg.model).toBe('claude-sonnet-4-6');
      expect(cfg.apiKey).toBe('sk-a');
    }
  });

  it('CLI overrides win over env and file', async () => {
    const cfg = await loadConfig({
      env: { AI_PROVIDER: 'openai', AI_API_KEY: 'sk-test' },
      overrides: { provider: 'ollama' },
    });
    expect(cfg.provider).toBe('ollama');
  });
});
