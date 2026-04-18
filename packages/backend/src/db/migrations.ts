import type { Database } from 'better-sqlite3';

export interface Migration {
  version: number;
  apply: (db: Database) => void;
}

// Baseline schema (v1) is applied directly from schema.sql in init.ts.
// Additional migrations for future schema bumps go here, ordered by version.
//
// v2 adds the `reviews` table used by GET /api/reviews
// (docs/02-data-model.md §2.8). schema.sql carries the canonical definition
// so fresh databases receive it as part of the baseline; this migration
// brings legacy v1 databases to parity.
const v2_addReviews: Migration = {
  version: 2,
  apply: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS reviews (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        source_type TEXT NOT NULL CHECK (source_type IN ('extract', 'link', 'impact', 'bundle')),
        node_id     TEXT REFERENCES nodes(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
        edge_id     INTEGER REFERENCES edges(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
        cr_id       TEXT REFERENCES change_requests(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
        severity    TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
        category    TEXT NOT NULL,
        message     TEXT NOT NULL,
        status      TEXT NOT NULL CHECK (status IN ('unresolved', 'resolved', 'rejected')) DEFAULT 'unresolved',
        created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews (status);
    `);
  },
};

export const MIGRATIONS: readonly Migration[] = [v2_addReviews];
