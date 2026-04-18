import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Database } from '../db/index.js';
import { makeApp, seedBaseNodes } from './test-helpers.js';

describe('GET /api/impact/:cr_id', () => {
  let app: FastifyInstance;
  let db: Database;

  beforeEach(async () => {
    ({ app, db } = await makeApp());
    seedBaseNodes(db);
    db.prepare(
      `INSERT INTO change_requests (id, title, description, status)
       VALUES ('CR-001', 'change title', 'change desc', 'analyzing')`,
    ).run();
    db.prepare(
      `INSERT INTO change_impacts (change_request_id, affected_node_id, impact_type, depth, analysis)
       VALUES ('CR-001', 'SPEC-001', 'direct', 0, 'Direct hit')`,
    ).run();
  });

  afterEach(async () => {
    await app.close();
    db.close();
  });

  it('returns the CR plus direct and transitive rows from approved edges only', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/impact/CR-001' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.change_request.id).toBe('CR-001');
    expect(body.direct.map((r: { node_id: string }) => r.node_id)).toEqual(['SPEC-001']);
    // SPEC-001 -> SPEC-002 is approved, SPEC-002 -> TC-001 is proposed (should be excluded).
    expect(body.transitive.map((r: { node_id: string }) => r.node_id)).toEqual(['SPEC-002']);
    expect(body.transitive[0].depth).toBe(1);
  });

  it('404s for unknown change request', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/impact/CR-999' });
    expect(res.statusCode).toBe(404);
  });

  it('validates the CR id shape', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/impact/not-a-cr' });
    expect(res.statusCode).toBe(400);
  });
});
