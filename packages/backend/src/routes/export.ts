import type { FastifyInstance } from 'fastify';
import type { Database } from 'better-sqlite3';
import { buildSnapshot } from '../services/export.js';

export async function registerExportRoute(app: FastifyInstance, db: Database): Promise<void> {
  app.get('/api/export', async () => buildSnapshot(db));
}
