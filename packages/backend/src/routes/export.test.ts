import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Database } from '../db/index.js';
import { makeApp, seedBaseNodes } from './test-helpers.js';

describe('GET /api/export and round-trip with /api/import', () => {
  let app: FastifyInstance;
  let db: Database;

  beforeEach(async () => {
    ({ app, db } = await makeApp());
    seedBaseNodes(db);
  });

  afterEach(async () => {
    await app.close();
    db.close();
  });

  it('exports the DB snapshot with all nodes and edges', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/export' });
    expect(res.statusCode).toBe(200);
    const snap = res.json();
    expect(snap.meta.type).toBe('snapshot');
    expect(snap.nodes).toHaveLength(4);
    expect(snap.edges).toHaveLength(3);
  });

  it('snapshot → import bundle keeps node/edge counts stable', async () => {
    const snapshotRes = await app.inject({ method: 'GET', url: '/api/export' });
    const snap = snapshotRes.json();
    const bundle = {
      meta: { type: 'bundle', source_files: ['snapshot'] },
      nodes: snap.nodes,
      // Snapshot edges have no `reasoning` (DB doesn't persist it per spec
      // §2.3). Fabricate one so the bundle re-import passes validation.
      edges: snap.edges.map(
        (e: {
          source_id: string;
          target_id: string;
          relation_type: string;
          confidence: number;
        }) => ({
          source_id: e.source_id,
          target_id: e.target_id,
          relation_type: e.relation_type,
          confidence: e.confidence,
          reasoning: 'reconstructed from snapshot',
        }),
      ),
      reviews: [],
    };
    const res = await app.inject({ method: 'POST', url: '/api/import', payload: bundle });
    expect(res.statusCode).toBe(200);
    // All nodes unchanged (same content), all edges existing so "updated".
    expect(res.json().nodes).toEqual({ created: 0, updated: 0, unchanged: 4 });
    expect(res.json().edges).toEqual({ created: 0, updated: 3 });
  });
});
