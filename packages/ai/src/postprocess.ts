// Post-processing helpers shared by every provider.
//
// Mirrors the behavior previously implemented in scripts/cli/lib.sh:
//   - strip a UTF-8 BOM and a wrapping ```json ... ``` fence
//   - parse as JSON
//   - ensure meta.generated_at is an ISO 8601 timestamp

const BOM = new RegExp('^\\uFEFF');
const FENCE_OPEN = /^[ \t]*```[A-Za-z0-9_-]*[ \t]*\r?\n/;
const FENCE_CLOSE = /\r?\n[ \t]*```[ \t]*$/;
const ISO_PREFIX = /^\d{4}-\d{2}-\d{2}T/;

export function stripFence(input: string): string {
  let s = input.replace(BOM, '');
  s = s.replace(/^\s+/, '').replace(/\s+$/, '');
  const open = s.match(FENCE_OPEN);
  if (open) {
    s = s.slice(open[0].length);
    s = s.replace(FENCE_CLOSE, '');
  }
  return s;
}

export function parseJson(text: string): unknown {
  const stripped = stripFence(text);
  try {
    return JSON.parse(stripped);
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    throw new Error(`provider output is not valid JSON: ${cause}`);
  }
}

export function ensureIsoTimestamp(json: unknown, now: Date = new Date()): unknown {
  if (!isObject(json)) return json;
  const meta = isObject(json.meta) ? { ...json.meta } : {};
  const generatedAt = meta.generated_at;
  if (typeof generatedAt !== 'string' || !ISO_PREFIX.test(generatedAt)) {
    meta.generated_at = now.toISOString();
  }
  return { ...json, meta };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
