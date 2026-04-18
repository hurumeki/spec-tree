import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Database } from '../db/index.js';
import { makeApp, seedBaseNodes } from './test-helpers.js';

describe('nodes routes', () => {
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

  it('GET /api/nodes returns all seeded nodes', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nodes' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.nodes.map((n: { id: string }) => n.id)).toEqual([
      'REQ-001',
      'SPEC-001',
      'SPEC-002',
      'TC-001',
    ]);
  });

  it('GET /api/nodes filters by type and status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/nodes?type=specification&status=draft',
    });
    expect(res.json().nodes.map((n: { id: string }) => n.id)).toEqual(['SPEC-002']);
  });

  it('GET /api/nodes supports substring search', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nodes?q=Requirement' });
    expect(res.json().nodes.map((n: { id: string }) => n.id)).toEqual(['REQ-001']);
  });

  it('GET /api/nodes/:id returns detail with related edges', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nodes/SPEC-001' });
    const body = res.json();
    expect(body.id).toBe('SPEC-001');
    expect(body.current_version).toBe(1);
    expect(body.related_edges).toHaveLength(2);
  });

  it('GET /api/nodes/:id 404s for unknown', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nodes/SPEC-999' });
    expect(res.statusCode).toBe(404);
  });

  it('PUT /api/nodes/:id content change bumps version', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/nodes/SPEC-001',
      payload: { content: 'updated body', change_reason: 'revision' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.current_version).toBe(2);
    expect(body.content).toBe('updated body');
    expect(body.change_reason).toBe('revision');
    expect(body.versions).toHaveLength(2);
  });

  it('PUT /api/nodes/:id status-only does not bump version', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/nodes/SPEC-002',
      payload: { status: 'approved' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('approved');
    expect(body.current_version).toBe(1);
  });

  it('PUT /api/nodes/:id rejects empty body', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/nodes/SPEC-001',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});
