import { describe, expect, it } from 'vitest';
import { ensureIsoTimestamp, parseJson, stripFence } from './postprocess.js';

describe('stripFence', () => {
  it('strips a ```json fence', () => {
    expect(stripFence('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('strips an unlabeled fence', () => {
    expect(stripFence('```\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('strips BOM and trims whitespace', () => {
    expect(stripFence('﻿  {"a":1}  ')).toBe('{"a":1}');
  });

  it('passes through unfenced JSON', () => {
    expect(stripFence('{"a":1}')).toBe('{"a":1}');
  });
});

describe('parseJson', () => {
  it('parses fenced JSON', () => {
    expect(parseJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('throws on invalid JSON', () => {
    expect(() => parseJson('not json')).toThrow(/not valid JSON/);
  });
});

describe('ensureIsoTimestamp', () => {
  const fixed = new Date('2026-04-25T00:00:00.000Z');

  it('fills missing meta.generated_at', () => {
    const out = ensureIsoTimestamp({ nodes: [] }, fixed) as { meta: { generated_at: string } };
    expect(out.meta.generated_at).toBe(fixed.toISOString());
  });

  it('keeps a valid timestamp', () => {
    const existing = '2026-01-02T03:04:05.000Z';
    const out = ensureIsoTimestamp({ meta: { generated_at: existing } }, fixed) as {
      meta: { generated_at: string };
    };
    expect(out.meta.generated_at).toBe(existing);
  });

  it('overwrites a non-ISO value', () => {
    const out = ensureIsoTimestamp({ meta: { generated_at: 'yesterday' } }, fixed) as {
      meta: { generated_at: string };
    };
    expect(out.meta.generated_at).toBe(fixed.toISOString());
  });

  it('returns non-objects untouched', () => {
    expect(ensureIsoTimestamp(null)).toBe(null);
    expect(ensureIsoTimestamp([1, 2])).toEqual([1, 2]);
  });
});
