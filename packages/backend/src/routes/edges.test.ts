import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Database } from '../db/index.js';
import { makeApp, seedBaseNodes } from './test-helpers.js';

describe('edges routes', () => {
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

  it('GET /api/edges returns all edges', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/edges' });
    expect(res.json().edges).toHaveLength(3);
  });

  it('GET /api/edges filters by status', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/edges?status=proposed' });
    const edges = res.json().edges;
    expect(edges).toHaveLength(1);
    expect(edges[0].source_id).toBe('SPEC-002');
  });

  it('PUT /api/edges/:id updates status and writes history', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/edges/3',
      payload: { status: 'approved', reason: 'Reviewed and accepted' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('approved');
    const history = db
      .prepare('SELECT action, reason FROM edge_history WHERE edge_id = 3')
      .all() as { action: string; reason: string }[];
    expect(history).toHaveLength(1);
    expect(history[0]?.action).toBe('modified');
    expect(history[0]?.reason).toBe('Reviewed and accepted');
  });

  it('PUT /api/edges/:id deprecation records "deprecated" action', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/edges/1',
      payload: { status: 'deprecated' },
    });
    expect(res.statusCode).toBe(200);
    const history = db.prepare('SELECT action FROM edge_history WHERE edge_id = 1').all() as {
      action: string;
    }[];
    expect(history[0]?.action).toBe('deprecated');
  });

  it('PUT /api/edges/:id 404s for unknown id', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/edges/999',
      payload: { status: 'approved' },
    });
    expect(res.statusCode).toBe(404);
  });
});
