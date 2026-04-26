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

// docs/02-data-model.md §2.1 — IDs are zero-padded 3-digit sequences (NNN).
// Capacity is therefore 999 per node type / 999 change requests, matching the
// 1 MB / ~50–200-node working envelope in §8.4.
const ID_MAX = 999;

function format3DigitId(prefix: string, next: number): string {
  if (next > ID_MAX) {
    throw new Error(
      `${prefix} ID space exhausted (max ${prefix}-${ID_MAX}); spec is 3-digit zero-padded`,
    );
  }
  return `${prefix}-${String(next).padStart(3, '0')}`;
}

export function mintNodeId(db: Database, type: NodeType): string {
  const prefix = PREFIX[type];
  const row = db
    .prepare(
      `SELECT MAX(CAST(substr(id, length(?) + 2) AS INTEGER)) AS max
       FROM nodes
       WHERE id LIKE ? || '-%' AND type = ?`,
    )
    .get(prefix, prefix, type) as { max: number | null };
  return format3DigitId(prefix, (row?.max ?? 0) + 1);
}

export function mintChangeRequestId(db: Database): string {
  const row = db
    .prepare(
      `SELECT MAX(CAST(substr(id, 4) AS INTEGER)) AS max
       FROM change_requests
       WHERE id LIKE 'CR-%'`,
    )
    .get() as { max: number | null };
  return format3DigitId('CR', (row?.max ?? 0) + 1);
}
