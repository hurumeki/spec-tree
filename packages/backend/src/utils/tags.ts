// Tags are persisted as a JSON-encoded string array in node_versions.tags
// (docs/02-data-model.md §2.2). Encoding lives here so callers don't need
// to remember the storage format.

export function encodeTags(tags: readonly string[] | undefined): string {
  return JSON.stringify(tags ?? []);
}

export function decodeTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}
