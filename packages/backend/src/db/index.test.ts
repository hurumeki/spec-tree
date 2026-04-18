import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  openDatabase,
  openInMemoryDatabase,
  type Database,
} from './index.js';

interface PragmaVersionRow {
  user_version: number;
}

interface PragmaFlagRow {
  foreign_keys: number;
}

interface PragmaJournalRow {
  journal_mode: string;
}

interface TableInfoRow {
  name: string;
  type: string;
  notnull: number;
  pk: number;
}

const TABLES = [
  'change_impacts',
  'change_requests',
  'edge_history',
  'edges',
  'node_versions',
  'nodes',
] as const;

const EXPECTED_COLUMNS: Record<(typeof TABLES)[number], readonly string[]> = {
  nodes: ['id', 'type', 'current_version', 'status', 'created_at', 'updated_at'],
  node_versions: [
    'id',
    'node_id',
    'version',
    'title',
    'content',
    'tags',
    'priority',
    'change_reason',
    'created_at',
  ],
  edges: ['id', 'source_id', 'target_id', 'relation_type', 'status', 'confidence', 'created_at'],
  edge_history: ['id', 'edge_id', 'action', 'reason', 'created_at'],
  change_requests: ['id', 'title', 'description', 'source_document', 'status', 'created_at'],
  change_impacts: [
    'id',
    'change_request_id',
    'affected_node_id',
    'impact_type',
    'depth',
    'analysis',
    'created_at',
  ],
};

const EXPECTED_INDEXES = [
  'idx_edges_source_status',
  'idx_edges_target',
  'idx_node_versions_node_version',
  'idx_edge_history_edge',
  'idx_change_impacts_cr',
];

function seedFixture(db: Database): void {
  const insertNode = db.prepare(
    'INSERT INTO nodes (id, type, current_version, status) VALUES (?, ?, 1, ?)',
  );
  insertNode.run('SPEC-001', 'specification', 'approved');
  insertNode.run('SPEC-002', 'specification', 'approved');
  insertNode.run('TC-001', 'test_case', 'approved');
  insertNode.run('SPEC-999', 'specification', 'approved');

  const insertEdge = db.prepare(
    'INSERT INTO edges (source_id, target_id, relation_type, status, confidence) VALUES (?, ?, ?, ?, ?)',
  );
  insertEdge.run('SPEC-001', 'SPEC-002', 'depends_on', 'approved', 0.9);
  insertEdge.run('SPEC-002', 'TC-001', 'verifies', 'approved', 0.8);
  insertEdge.run('SPEC-001', 'SPEC-999', 'depends_on', 'deprecated', 0.5);
}

describe('openDatabase (in-memory)', () => {
  let db: Database;

  beforeEach(() => {
    db = openInMemoryDatabase();
  });

  afterEach(() => {
    db.close();
  });

  it('sets user_version to CURRENT_SCHEMA_VERSION', () => {
    const rows = db.pragma('user_version') as PragmaVersionRow[];
    expect(rows[0]?.user_version).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('creates all six tables with the expected columns', () => {
    for (const table of TABLES) {
      const info = db.pragma(`table_info(${table})`) as TableInfoRow[];
      const names = info.map((row) => row.name).sort();
      expect(names).toEqual([...EXPECTED_COLUMNS[table]].sort());
    }
  });

  it('creates the expected indexes', () => {
    const rows = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'")
      .all() as Array<{ name: string }>;
    const names = rows.map((row) => row.name).sort();
    expect(names).toEqual([...EXPECTED_INDEXES].sort());
  });

  it('enables foreign-key enforcement', () => {
    const rows = db.pragma('foreign_keys') as PragmaFlagRow[];
    expect(rows[0]?.foreign_keys).toBe(1);

    expect(() =>
      db
        .prepare(
          'INSERT INTO edges (source_id, target_id, relation_type, status, confidence) VALUES (?, ?, ?, ?, ?)',
        )
        .run('SPEC-MISSING', 'SPEC-ALSO-MISSING', 'depends_on', 'approved', 0.5),
    ).toThrow(/FOREIGN KEY/);
  });

  it('rejects invalid enum values via CHECK constraints', () => {
    const insertNode = db.prepare(
      'INSERT INTO nodes (id, type, current_version, status) VALUES (?, ?, 1, ?)',
    );

    expect(() => insertNode.run('REQ-001', 'wrong', 'draft')).toThrow(/CHECK/);
    expect(() => insertNode.run('REQ-002', 'requirement', 'unknown')).toThrow(/CHECK/);

    insertNode.run('REQ-003', 'requirement', 'approved');
    insertNode.run('SPEC-100', 'specification', 'approved');

    const insertEdge = db.prepare(
      'INSERT INTO edges (source_id, target_id, relation_type, status, confidence) VALUES (?, ?, ?, ?, ?)',
    );
    expect(() => insertEdge.run('REQ-003', 'SPEC-100', 'realises', 'approved', 0.5)).toThrow(
      /CHECK/,
    );
    expect(() => insertEdge.run('REQ-003', 'SPEC-100', 'realizes', 'approved', 1.5)).toThrow(
      /CHECK/,
    );

    db.prepare(
      "INSERT INTO change_requests (id, title, description, status) VALUES ('CR-001', 't', 'd', 'analyzing')",
    ).run();
    expect(() =>
      db
        .prepare(
          'INSERT INTO change_impacts (change_request_id, affected_node_id, impact_type, depth) VALUES (?, ?, ?, ?)',
        )
        .run('CR-001', 'REQ-003', 'indirect', 0),
    ).toThrow(/CHECK/);
  });

  it('populates created_at with an ISO 8601 UTC timestamp by default', () => {
    db.prepare(
      "INSERT INTO nodes (id, type, current_version, status) VALUES ('REQ-010', 'requirement', 1, 'draft')",
    ).run();
    const row = db.prepare("SELECT created_at FROM nodes WHERE id = 'REQ-010'").get() as {
      created_at: string;
    };
    expect(row.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('executes the §7.2 recursive CTE excluding deprecated edges', () => {
    seedFixture(db);
    const rows = db
      .prepare(
        `WITH RECURSIVE impact(node_id, depth, path) AS (
           SELECT 'SPEC-001', 0, 'SPEC-001'
           UNION ALL
           SELECT e.target_id, i.depth + 1, i.path || ' -> ' || e.target_id
           FROM impact i
           JOIN edges e ON e.source_id = i.node_id
           WHERE i.depth < 5 AND e.status = 'approved'
         )
         SELECT node_id, depth FROM impact ORDER BY depth, node_id`,
      )
      .all() as Array<{ node_id: string; depth: number }>;

    expect(rows).toEqual([
      { node_id: 'SPEC-001', depth: 0 },
      { node_id: 'SPEC-002', depth: 1 },
      { node_id: 'TC-001', depth: 2 },
    ]);
    expect(rows.some((r) => r.node_id === 'SPEC-999')).toBe(false);
  });
});

describe('openDatabase (file-backed)', () => {
  let tmp: string;
  let dbPath: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'spec-tree-db-'));
    dbPath = join(tmp, 'trace.db');
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('enables WAL journal mode and is idempotent on reopen', () => {
    const first = openDatabase(dbPath);
    const firstMode = (first.pragma('journal_mode') as PragmaJournalRow[])[0]?.journal_mode;
    expect(firstMode).toBe('wal');
    first.close();

    const second = openDatabase(dbPath);
    const version = (second.pragma('user_version') as PragmaVersionRow[])[0]?.user_version;
    expect(version).toBe(CURRENT_SCHEMA_VERSION);
    second.close();
  });
});
