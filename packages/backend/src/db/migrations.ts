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

// v3 replaces the Japanese priority enum (高/中/低) with English
// (high/middle/low) on node_versions. SQLite cannot alter a CHECK
// constraint in place, so the table is rebuilt with data migrated by a
// CASE expression. schema.sql already carries the new constraint for
// fresh databases; this migration brings legacy v2 databases to parity.
const v3_englishPriority: Migration = {
  version: 3,
  apply: (db) => {
    db.exec(`
      CREATE TABLE node_versions_new (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        node_id       TEXT NOT NULL REFERENCES nodes(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
        version       INTEGER NOT NULL,
        title         TEXT NOT NULL,
        content       TEXT NOT NULL,
        tags          TEXT NOT NULL DEFAULT '[]',
        priority      TEXT NOT NULL CHECK (priority IN ('high', 'middle', 'low')),
        change_reason TEXT,
        created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        UNIQUE (node_id, version)
      );
      INSERT INTO node_versions_new
        (id, node_id, version, title, content, tags, priority, change_reason, created_at)
      SELECT
        id, node_id, version, title, content, tags,
        CASE priority
          WHEN '高' THEN 'high'
          WHEN '中' THEN 'middle'
          WHEN '低' THEN 'low'
          ELSE priority
        END,
        change_reason, created_at
      FROM node_versions;
      DROP TABLE node_versions;
      ALTER TABLE node_versions_new RENAME TO node_versions;
      CREATE INDEX IF NOT EXISTS idx_node_versions_node_version ON node_versions (node_id, version);
    `);
  },
};

// v4 adds a composite index on nodes(type, status) so the
// `GET /api/nodes?type=...&status=...` filter served by listNodes() can be
// satisfied without a sequential scan once the table grows. schema.sql
// carries the canonical definition; this migration brings legacy v3
// databases to parity.
const v4_addNodesTypeStatusIndex: Migration = {
  version: 4,
  apply: (db) => {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_nodes_type_status ON nodes (type, status);`);
  },
};

export const MIGRATIONS: readonly Migration[] = [
  v2_addReviews,
  v3_englishPriority,
  v4_addNodesTypeStatusIndex,
];
