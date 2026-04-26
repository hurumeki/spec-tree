import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Database } from '../db/index.js';
import { makeApp } from './test-helpers.js';

describe('GET /api/reviews', () => {
  let app: FastifyInstance;
  let db: Database;

  beforeEach(async () => {
    ({ app, db } = await makeApp());
    db.prepare(
      `INSERT INTO reviews (source_type, severity, category, message, status) VALUES
        ('extract','warning','ambiguous','Unclear wording','unresolved'),
        ('extract','info','style','Minor nit','resolved'),
        ('link','error','missing','No target','unresolved')`,
    ).run();
  });

  afterEach(async () => {
    await app.close();
    db.close();
  });

  it('defaults to unresolved only', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/reviews' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.reviews).toHaveLength(2);
    expect(body.reviews.every((r: { status: string }) => r.status === 'unresolved')).toBe(true);
  });

  it('?status=all returns every row', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/reviews?status=all' });
    expect(res.json().reviews).toHaveLength(3);
  });

  it('?status=resolved filters to resolved', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/reviews?status=resolved' });
    const body = res.json();
    expect(body.reviews).toHaveLength(1);
    expect(body.reviews[0].category).toBe('style');
  });
});

describe('PATCH /api/reviews/:id', () => {
  let app: FastifyInstance;
  let db: Database;

  beforeEach(async () => {
    ({ app, db } = await makeApp());
    db.prepare(
      `INSERT INTO reviews (source_type, severity, category, message)
         VALUES ('extract','warning','ambiguous','Unclear wording')`,
    ).run();
  });

  afterEach(async () => {
    await app.close();
    db.close();
  });

  it('marks an unresolved review as resolved', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/reviews/1',
      payload: { status: 'resolved' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().review.status).toBe('resolved');
    const row = db.prepare(`SELECT status FROM reviews WHERE id = 1`).get() as { status: string };
    expect(row.status).toBe('resolved');
  });

  it('marks an unresolved review as rejected', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/reviews/1',
      payload: { status: 'rejected' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().review.status).toBe('rejected');
  });

  it('rejects status=unresolved (must be resolved or rejected)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/reviews/1',
      payload: { status: 'unresolved' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('404s for unknown id', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/reviews/9999',
      payload: { status: 'resolved' },
    });
    expect(res.statusCode).toBe(404);
  });
});
