import type { Database } from 'better-sqlite3';
import type { z } from 'zod';
import type { EdgePayloadSchema, EdgeStatusSchema, RelationTypeSchema } from '../schemas/common.js';

type EdgeStatus = z.infer<typeof EdgeStatusSchema>;
type RelationType = z.infer<typeof RelationTypeSchema>;
type EdgePayload = z.infer<typeof EdgePayloadSchema>;

export interface EdgeRow {
  id: number;
  source_id: string;
  target_id: string;
  relation_type: RelationType;
  status: EdgeStatus;
  confidence: number;
  created_at: string;
}

export interface ListEdgesFilter {
  status?: EdgeStatus;
  relation_type?: RelationType;
  source_id?: string;
  target_id?: string;
}

export function listEdges(db: Database, filter: ListEdgesFilter): EdgeRow[] {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.status) {
    where.push('status = ?');
    params.push(filter.status);
  }
  if (filter.relation_type) {
    where.push('relation_type = ?');
    params.push(filter.relation_type);
  }
  if (filter.source_id) {
    where.push('source_id = ?');
    params.push(filter.source_id);
  }
  if (filter.target_id) {
    where.push('target_id = ?');
    params.push(filter.target_id);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return db
    .prepare(
      `SELECT id, source_id, target_id, relation_type, status, confidence, created_at
         FROM edges ${whereSql}
         ORDER BY id`,
    )
    .all(...params) as EdgeRow[];
}

export interface UpdateEdgeInput {
  status: EdgeStatus;
  reason?: string;
}

export function updateEdge(db: Database, id: number, input: UpdateEdgeInput): EdgeRow {
  return db.transaction(() => {
    const existing = db.prepare(`SELECT status FROM edges WHERE id = ?`).get(id) as
      | { status: EdgeStatus }
      | undefined;
    if (!existing) {
      const err = new Error(`Edge ${id} not found`) as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }
    if (existing.status !== input.status) {
      db.prepare(`UPDATE edges SET status = ? WHERE id = ?`).run(input.status, id);
      const action = input.status === 'deprecated' ? 'deprecated' : 'modified';
      db.prepare(`INSERT INTO edge_history (edge_id, action, reason) VALUES (?, ?, ?)`).run(
        id,
        action,
        input.reason ?? null,
      );
    }
    const row = db
      .prepare(
        `SELECT id, source_id, target_id, relation_type, status, confidence, created_at
           FROM edges WHERE id = ?`,
      )
      .get(id) as EdgeRow;
    return row;
  })();
}

/**
 * Upsert an edge keyed by (source_id, target_id, relation_type). New rows
 * land with status='proposed' per docs/06-web-ui.md §6.2.4 and get an
 * `edge_history` row. Existing rows get their `confidence` refreshed.
 */
export function upsertImportedEdge(db: Database, payload: EdgePayload): 'created' | 'updated' {
  const existing = db
    .prepare(`SELECT id FROM edges WHERE source_id = ? AND target_id = ? AND relation_type = ?`)
    .get(payload.source_id, payload.target_id, payload.relation_type) as { id: number } | undefined;
  if (existing) {
    db.prepare(`UPDATE edges SET confidence = ? WHERE id = ?`).run(payload.confidence, existing.id);
    db.prepare(`INSERT INTO edge_history (edge_id, action, reason) VALUES (?, 'modified', ?)`).run(
      existing.id,
      payload.reasoning ?? null,
    );
    return 'updated';
  }
  const result = db
    .prepare(
      `INSERT INTO edges (source_id, target_id, relation_type, status, confidence)
       VALUES (?, ?, ?, 'proposed', ?)`,
    )
    .run(payload.source_id, payload.target_id, payload.relation_type, payload.confidence);
  const newId = Number(result.lastInsertRowid);
  db.prepare(`INSERT INTO edge_history (edge_id, action, reason) VALUES (?, 'created', ?)`).run(
    newId,
    payload.reasoning ?? null,
  );
  return 'created';
}
