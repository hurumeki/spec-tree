import type { Database } from 'better-sqlite3';
import type { z } from 'zod';
import type { DbSnapshotSchema } from '../schemas/cli-json.js';

type DbSnapshot = z.infer<typeof DbSnapshotSchema>;

interface SnapshotNodeRow {
  id: string;
  type: DbSnapshot['nodes'][number]['type'];
  title: string;
  content: string;
  tags: string;
  priority: DbSnapshot['nodes'][number]['priority'];
  change_reason: string | null;
  version: number;
  status: DbSnapshot['nodes'][number]['status'];
  created_at: string;
  updated_at: string;
}

interface SnapshotEdgeRow {
  id: number;
  source_id: string;
  target_id: string;
  relation_type: DbSnapshot['edges'][number]['relation_type'];
  status: DbSnapshot['edges'][number]['status'];
  confidence: number;
  created_at: string;
}

export function buildSnapshot(db: Database): DbSnapshot {
  const nodes = db
    .prepare(
      `SELECT n.id, n.type, n.status, n.created_at, n.updated_at,
              v.version, v.title, v.content, v.tags, v.priority, v.change_reason
         FROM nodes n
         JOIN node_versions v ON v.node_id = n.id AND v.version = n.current_version
         ORDER BY n.id`,
    )
    .all() as SnapshotNodeRow[];
  const edges = db
    .prepare(
      `SELECT id, source_id, target_id, relation_type, status, confidence, created_at
         FROM edges ORDER BY id`,
    )
    .all() as SnapshotEdgeRow[];
  return {
    meta: {
      type: 'snapshot',
      exported_at: new Date().toISOString(),
    },
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      content: n.content,
      tags: JSON.parse(n.tags) as string[],
      priority: n.priority,
      change_reason: n.change_reason ?? undefined,
      version: n.version,
      status: n.status,
      created_at: n.created_at,
      updated_at: n.updated_at,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source_id: e.source_id,
      target_id: e.target_id,
      relation_type: e.relation_type,
      confidence: e.confidence,
      status: e.status,
      created_at: e.created_at,
    })),
  };
}
