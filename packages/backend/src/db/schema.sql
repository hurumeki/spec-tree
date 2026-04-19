-- spec-tree SQLite schema
-- Source of truth: docs/02-data-model.md (sections 2.1 - 2.8)
-- All statements are idempotent. Bumped via PRAGMA user_version (see init.ts).

CREATE TABLE IF NOT EXISTS nodes (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL CHECK (type IN ('requirement', 'specification', 'test_case')),
  current_version INTEGER NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('draft', 'reviewed', 'approved', 'deprecated')),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS node_versions (
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

CREATE TABLE IF NOT EXISTS edges (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id     TEXT NOT NULL REFERENCES nodes(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  target_id     TEXT NOT NULL REFERENCES nodes(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('realizes', 'verifies', 'depends_on')),
  status        TEXT NOT NULL CHECK (status IN ('proposed', 'approved', 'deprecated')),
  confidence    REAL NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS edge_history (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  edge_id    INTEGER NOT NULL REFERENCES edges(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  action     TEXT NOT NULL CHECK (action IN ('created', 'deleted', 'modified', 'deprecated')),
  reason     TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS change_requests (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  source_document TEXT,
  status          TEXT NOT NULL CHECK (status IN ('analyzing', 'reviewed', 'applied')),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS change_impacts (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  change_request_id TEXT NOT NULL REFERENCES change_requests(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  affected_node_id  TEXT NOT NULL REFERENCES nodes(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  impact_type       TEXT NOT NULL CHECK (impact_type IN ('direct', 'transitive')),
  depth             INTEGER NOT NULL CHECK (depth >= 0),
  analysis          TEXT,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

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

CREATE INDEX IF NOT EXISTS idx_edges_source_status        ON edges (source_id, status);
CREATE INDEX IF NOT EXISTS idx_edges_target               ON edges (target_id);
CREATE INDEX IF NOT EXISTS idx_node_versions_node_version ON node_versions (node_id, version);
CREATE INDEX IF NOT EXISTS idx_edge_history_edge          ON edge_history (edge_id);
CREATE INDEX IF NOT EXISTS idx_change_impacts_cr          ON change_impacts (change_request_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status             ON reviews (status);
