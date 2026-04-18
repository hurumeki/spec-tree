import { describe, expect, it } from 'vitest';
import { bootstrap } from './bootstrap';

describe('bootstrap', () => {
  it('returns the placeholder string', () => {
    expect(bootstrap()).toBe('traceability backend (placeholder)');
  });
});
