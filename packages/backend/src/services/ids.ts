import type { Database } from 'better-sqlite3';
import type { z } from 'zod';
import type { NodeTypeSchema } from '../schemas/common.js';

type NodeType = z.infer<typeof NodeTypeSchema>;

const PREFIX: Record<NodeType, string> = {
  requirement: 'REQ',
  specification: 'SPEC',
  test_case: 'TC',
};

export function nodeTypeFromId(id: string): NodeType {
  if (id.startsWith('REQ-')) return 'requirement';
  if (id.startsWith('SPEC-')) return 'specification';
  if (id.startsWith('TC-')) return 'test_case';
  throw new Error(`Unknown node ID prefix: ${id}`);
}

/**
 * Mint the next ID within a type by scanning existing `nodes.id`. Returns a
 * zero-padded sequence of at least 3 digits (e.g. `SPEC-007`, `SPEC-123`,
 * `SPEC-1000`).
 */
export function mintNodeId(db: Database, type: NodeType): string {
  const prefix = PREFIX[type];
  const row = db
    .prepare(
      `SELECT MAX(CAST(substr(id, length(?) + 2) AS INTEGER)) AS max
       FROM nodes
       WHERE id LIKE ? || '-%' AND type = ?`,
    )
    .get(prefix, prefix, type) as { max: number | null };
  const next = (row?.max ?? 0) + 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
}

/** Mint the next CR-### id. */
export function mintChangeRequestId(db: Database): string {
  const row = db
    .prepare(
      `SELECT MAX(CAST(substr(id, 4) AS INTEGER)) AS max
       FROM change_requests
       WHERE id LIKE 'CR-%'`,
    )
    .get() as { max: number | null };
  const next = (row?.max ?? 0) + 1;
  return `CR-${String(next).padStart(3, '0')}`;
}
