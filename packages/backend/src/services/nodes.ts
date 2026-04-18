import type { Database } from 'better-sqlite3';
import type { z } from 'zod';
import type {
  NodePayloadSchema,
  NodeStatusSchema,
  NodeTypeSchema,
  PrioritySchema,
} from '../schemas/common.js';
import { nodeTypeFromId } from './ids.js';

type NodePayload = z.infer<typeof NodePayloadSchema>;
type NodeStatus = z.infer<typeof NodeStatusSchema>;
type NodeType = z.infer<typeof NodeTypeSchema>;
type Priority = z.infer<typeof PrioritySchema>;

export interface NodeSummary {
  id: string;
  type: NodeType;
  status: NodeStatus;
  current_version: number;
  title: string;
  priority: Priority;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface NodeDetail extends NodeSummary {
  content: string;
  change_reason: string | null;
  version_created_at: string;
  related_edges: {
    id: number;
    source_id: string;
    target_id: string;
    relation_type: 'realizes' | 'verifies' | 'depends_on';
    status: 'proposed' | 'approved' | 'deprecated';
    confidence: number;
  }[];
  versions: { version: number; title: string; created_at: string; change_reason: string | null }[];
}

export interface ListNodesFilter {
  type?: NodeType;
  status?: NodeStatus;
  q?: string;
}

interface NodeRow {
  id: string;
  type: NodeType;
  status: NodeStatus;
  current_version: number;
  title: string;
  priority: Priority;
  tags: string;
  created_at: string;
  updated_at: string;
}

function decodeTags(tags: string): string[] {
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function rowToSummary(row: NodeRow): NodeSummary {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    current_version: row.current_version,
    title: row.title,
    priority: row.priority,
    tags: decodeTags(row.tags),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function listNodes(db: Database, filter: ListNodesFilter): NodeSummary[] {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.type) {
    where.push('n.type = ?');
    params.push(filter.type);
  }
  if (filter.status) {
    where.push('n.status = ?');
    params.push(filter.status);
  }
  if (filter.q) {
    where.push('(v.title LIKE ? OR v.content LIKE ?)');
    const needle = `%${filter.q}%`;
    params.push(needle, needle);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `SELECT n.id, n.type, n.status, n.current_version, n.created_at, n.updated_at,
              v.title, v.priority, v.tags
         FROM nodes n
         JOIN node_versions v
           ON v.node_id = n.id AND v.version = n.current_version
         ${whereSql}
         ORDER BY n.id`,
    )
    .all(...params) as NodeRow[];
  return rows.map(rowToSummary);
}

export function getNodeDetail(db: Database, id: string): NodeDetail | null {
  const row = db
    .prepare(
      `SELECT n.id, n.type, n.status, n.current_version, n.created_at, n.updated_at,
              v.title, v.priority, v.tags, v.content, v.change_reason,
              v.created_at AS version_created_at
         FROM nodes n
         JOIN node_versions v
           ON v.node_id = n.id AND v.version = n.current_version
        WHERE n.id = ?`,
    )
    .get(id) as
    | (NodeRow & { content: string; change_reason: string | null; version_created_at: string })
    | undefined;
  if (!row) return null;
  const related_edges = db
    .prepare(
      `SELECT id, source_id, target_id, relation_type, status, confidence
         FROM edges
        WHERE source_id = ? OR target_id = ?
        ORDER BY id`,
    )
    .all(id, id) as NodeDetail['related_edges'];
  const versions = db
    .prepare(
      `SELECT version, title, created_at, change_reason
         FROM node_versions
        WHERE node_id = ?
        ORDER BY version DESC`,
    )
    .all(id) as NodeDetail['versions'];
  return {
    ...rowToSummary(row),
    content: row.content,
    change_reason: row.change_reason,
    version_created_at: row.version_created_at,
    related_edges,
    versions,
  };
}

export interface UpdateNodeInput {
  status?: NodeStatus;
  title?: string;
  content?: string;
  tags?: string[];
  priority?: Priority;
  change_reason?: string;
}

/**
 * Applies a partial update. If any content-bearing field (title/content/tags/
 * priority) is supplied we bump the version per docs/08-operations.md §8.2.
 * Returns the refreshed detail.
 */
export function updateNode(db: Database, id: string, input: UpdateNodeInput): NodeDetail {
  return db.transaction(() => {
    const existing = db
      .prepare(
        `SELECT n.current_version, v.title, v.content, v.tags, v.priority
           FROM nodes n
           JOIN node_versions v ON v.node_id = n.id AND v.version = n.current_version
          WHERE n.id = ?`,
      )
      .get(id) as
      | {
          current_version: number;
          title: string;
          content: string;
          tags: string;
          priority: Priority;
        }
      | undefined;
    if (!existing) {
      const err = new Error(`Node ${id} not found`) as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    const wantsContentBump =
      input.title !== undefined ||
      input.content !== undefined ||
      input.tags !== undefined ||
      input.priority !== undefined;

    if (wantsContentBump) {
      const nextVersion = existing.current_version + 1;
      db.prepare(
        `INSERT INTO node_versions
           (node_id, version, title, content, tags, priority, change_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        nextVersion,
        input.title ?? existing.title,
        input.content ?? existing.content,
        JSON.stringify(input.tags ?? decodeTags(existing.tags)),
        input.priority ?? existing.priority,
        input.change_reason ?? null,
      );
      db.prepare(
        `UPDATE nodes
            SET current_version = ?,
                updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
          WHERE id = ?`,
      ).run(nextVersion, id);
    }

    if (input.status !== undefined) {
      db.prepare(
        `UPDATE nodes SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
      ).run(input.status, id);
    }

    const detail = getNodeDetail(db, id);
    if (!detail) throw new Error('impossible: node vanished mid-transaction');
    return detail;
  })();
}

/**
 * Insert a brand-new node with a version-1 row. Status defaults to `draft`
 * per §8.1. Used by the import service.
 */
export function createNode(db: Database, payload: NodePayload, status: NodeStatus = 'draft'): void {
  const type = nodeTypeFromId(payload.id);
  db.prepare(`INSERT INTO nodes (id, type, current_version, status) VALUES (?, ?, 1, ?)`).run(
    payload.id,
    type,
    status,
  );
  db.prepare(
    `INSERT INTO node_versions (node_id, version, title, content, tags, priority, change_reason)
     VALUES (?, 1, ?, ?, ?, ?, ?)`,
  ).run(
    payload.id,
    payload.title,
    payload.content,
    JSON.stringify(payload.tags ?? []),
    payload.priority,
    payload.change_reason ?? null,
  );
}

/**
 * Upsert a node from imported CLI JSON: insert if new, otherwise bump version
 * only if any content field changed.
 */
export function upsertImportedNode(
  db: Database,
  payload: NodePayload,
): 'created' | 'updated' | 'unchanged' {
  const existing = db
    .prepare(
      `SELECT n.current_version, v.title, v.content, v.tags, v.priority
         FROM nodes n
         JOIN node_versions v ON v.node_id = n.id AND v.version = n.current_version
        WHERE n.id = ?`,
    )
    .get(payload.id) as
    | { current_version: number; title: string; content: string; tags: string; priority: Priority }
    | undefined;
  if (!existing) {
    createNode(db, payload);
    return 'created';
  }
  const tagsStr = JSON.stringify(payload.tags ?? []);
  const changed =
    existing.title !== payload.title ||
    existing.content !== payload.content ||
    existing.tags !== tagsStr ||
    existing.priority !== payload.priority;
  if (!changed) return 'unchanged';
  const nextVersion = existing.current_version + 1;
  db.prepare(
    `INSERT INTO node_versions (node_id, version, title, content, tags, priority, change_reason)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    payload.id,
    nextVersion,
    payload.title,
    payload.content,
    tagsStr,
    payload.priority,
    payload.change_reason ?? null,
  );
  db.prepare(
    `UPDATE nodes SET current_version = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
  ).run(nextVersion, payload.id);
  return 'updated';
}
