import type { Database } from 'better-sqlite3';
import type { z } from 'zod';
import type { ChangeRequestStatusSchema } from '../schemas/common.js';

type CRStatus = z.infer<typeof ChangeRequestStatusSchema>;

export interface ImpactRow {
  node_id: string;
  depth: number;
  impact_type: 'direct' | 'transitive';
  analysis: string | null;
  path?: string;
}

export interface ImpactResponse {
  change_request: {
    id: string;
    title: string;
    description: string;
    source_document: string | null;
    status: CRStatus;
    created_at: string;
  };
  direct: ImpactRow[];
  transitive: ImpactRow[];
}

/**
 * docs/07-impact-analysis.md §7.2 — the recursive CTE traverses approved
 * edges outward from each AI-identified direct node, capturing depth.
 */
const MAX_DEPTH = 5;

export function getImpact(db: Database, crId: string): ImpactResponse | null {
  const cr = db
    .prepare(
      `SELECT id, title, description, source_document, status, created_at
         FROM change_requests WHERE id = ?`,
    )
    .get(crId) as ImpactResponse['change_request'] | undefined;
  if (!cr) return null;

  const directs = db
    .prepare(
      `SELECT affected_node_id AS node_id, analysis
         FROM change_impacts
        WHERE change_request_id = ? AND impact_type = 'direct'
        ORDER BY id`,
    )
    .all(crId) as { node_id: string; analysis: string | null }[];

  if (directs.length === 0) {
    return { change_request: cr, direct: [], transitive: [] };
  }

  const placeholders = directs.map(() => '?').join(',');
  // Seed the CTE with every direct node at depth 0, then extend along approved
  // edges up to MAX_DEPTH. We dedupe by (node_id, MIN(depth)) so the shortest
  // chain wins.
  const sql = `
    WITH RECURSIVE impact(node_id, depth, path) AS (
      SELECT id, 0, id FROM nodes WHERE id IN (${placeholders})
      UNION ALL
      SELECT e.target_id, i.depth + 1, i.path || ' -> ' || e.target_id
      FROM impact i
      JOIN edges e ON e.source_id = i.node_id
      WHERE i.depth < ${MAX_DEPTH} AND e.status = 'approved'
    )
    SELECT node_id, MIN(depth) AS depth, path
      FROM impact
     GROUP BY node_id
     ORDER BY depth, node_id;
  `;
  const rows = db.prepare(sql).all(...directs.map((d) => d.node_id)) as {
    node_id: string;
    depth: number;
    path: string;
  }[];

  const analysisBy = new Map(directs.map((d) => [d.node_id, d.analysis]));
  const direct: ImpactRow[] = [];
  const transitive: ImpactRow[] = [];
  for (const r of rows) {
    if (r.depth === 0) {
      direct.push({
        node_id: r.node_id,
        depth: 0,
        impact_type: 'direct',
        analysis: analysisBy.get(r.node_id) ?? null,
        path: r.path,
      });
    } else {
      transitive.push({
        node_id: r.node_id,
        depth: r.depth,
        impact_type: 'transitive',
        analysis: null,
        path: r.path,
      });
    }
  }
  return { change_request: cr, direct, transitive };
}
