import type { Database } from 'better-sqlite3';
import type { z } from 'zod';
import type {
  ReviewPayloadSchema,
  ReviewSourceTypeSchema,
  ReviewStatusSchema,
} from '../schemas/common.js';

type ReviewPayload = z.infer<typeof ReviewPayloadSchema>;
type ReviewStatus = z.infer<typeof ReviewStatusSchema>;
type ReviewSourceType = z.infer<typeof ReviewSourceTypeSchema>;

export interface ReviewRow {
  id: number;
  source_type: ReviewSourceType;
  node_id: string | null;
  edge_id: number | null;
  cr_id: string | null;
  severity: 'info' | 'warning' | 'error';
  category: string;
  message: string;
  status: ReviewStatus;
  created_at: string;
}

export function insertReviews(
  db: Database,
  source_type: ReviewSourceType,
  reviews: ReviewPayload[],
): void {
  const stmt = db.prepare(
    `INSERT INTO reviews (source_type, node_id, edge_id, cr_id, severity, category, message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const r of reviews) {
    stmt.run(
      source_type,
      r.node_id ?? null,
      r.edge_id ?? null,
      r.cr_id ?? null,
      r.severity,
      r.category,
      r.message,
    );
  }
}

export function listReviews(db: Database, filter: { status?: ReviewStatus | 'all' }): ReviewRow[] {
  const status = filter.status ?? 'unresolved';
  if (status === 'all') {
    return db
      .prepare(
        `SELECT id, source_type, node_id, edge_id, cr_id, severity, category, message, status, created_at
           FROM reviews ORDER BY id DESC`,
      )
      .all() as ReviewRow[];
  }
  return db
    .prepare(
      `SELECT id, source_type, node_id, edge_id, cr_id, severity, category, message, status, created_at
         FROM reviews WHERE status = ? ORDER BY id DESC`,
    )
    .all(status) as ReviewRow[];
}
