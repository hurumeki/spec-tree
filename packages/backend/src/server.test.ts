import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { openInMemoryDatabase, type Database } from './db/index.js';
import { buildApp } from './server.js';

describe('server hardening', () => {
  let app: FastifyInstance | null = null;
  let db: Database | null = null;

  afterEach(async () => {
    if (app) await app.close();
    if (db) db.close();
    app = null;
    db = null;
  });

  it('GET /api/health reports DB ok when reachable', async () => {
    db = openInMemoryDatabase();
    app = await buildApp(db);
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, db: 'ok' });
  });

  it('GET /api/health returns 503 when the DB is closed', async () => {
    db = openInMemoryDatabase();
    app = await buildApp(db);
    db.close();
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ ok: false, db: 'error' });
  });

  it('rejects unauthenticated requests when API_TOKEN is set', async () => {
    db = openInMemoryDatabase();
    app = await buildApp(db, { apiToken: 'sekret' });
    const res = await app.inject({ method: 'GET', url: '/api/nodes' });
    expect(res.statusCode).toBe(401);
  });

  it('allows /api/health without auth even with API_TOKEN set', async () => {
    db = openInMemoryDatabase();
    app = await buildApp(db, { apiToken: 'sekret' });
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
  });

  it('accepts the configured Bearer token', async () => {
    db = openInMemoryDatabase();
    app = await buildApp(db, { apiToken: 'sekret' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/nodes',
      headers: { authorization: 'Bearer sekret' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('rejects requests with a wrong-length Bearer token', async () => {
    db = openInMemoryDatabase();
    app = await buildApp(db, { apiToken: 'sekret' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/nodes',
      headers: { authorization: 'Bearer wrong' },
    });
    expect(res.statusCode).toBe(401);
  });
});
