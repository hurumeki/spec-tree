import type { FastifyInstance } from 'fastify';
import { openInMemoryDatabase, type Database } from '../db/index.js';
import { buildApp } from '../server.js';

export async function makeApp(): Promise<{ app: FastifyInstance; db: Database }> {
  const db = openInMemoryDatabase();
  const app = await buildApp(db);
  return { app, db };
}

export function seedBaseNodes(db: Database): void {
  const insertNode = db.prepare(
    `INSERT INTO nodes (id, type, current_version, status) VALUES (?, ?, 1, ?)`,
  );
  const insertVersion = db.prepare(
    `INSERT INTO node_versions (node_id, version, title, content, tags, priority)
     VALUES (?, 1, ?, ?, ?, ?)`,
  );
  const rows = [
    ['REQ-001', 'requirement', 'approved', 'Requirement one', 'req one content', '["req"]', 'high'],
    ['SPEC-001', 'specification', 'approved', 'Spec one', 'spec one content', '[]', 'middle'],
    ['SPEC-002', 'specification', 'draft', 'Spec two', 'spec two content', '[]', 'middle'],
    ['TC-001', 'test_case', 'draft', 'Test one', 'tc one content', '[]', 'low'],
  ] as const;
  for (const [id, type, status, title, content, tags, priority] of rows) {
    insertNode.run(id, type, status);
    insertVersion.run(id, title, content, tags, priority);
  }

  const insertEdge = db.prepare(
    `INSERT INTO edges (source_id, target_id, relation_type, status, confidence) VALUES (?, ?, ?, ?, ?)`,
  );
  insertEdge.run('REQ-001', 'SPEC-001', 'realizes', 'approved', 0.9);
  insertEdge.run('SPEC-001', 'SPEC-002', 'depends_on', 'approved', 0.8);
  insertEdge.run('SPEC-002', 'TC-001', 'verifies', 'proposed', 0.6);
}
