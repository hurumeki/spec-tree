import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type { Database } from 'better-sqlite3';
import { ImportPayloadSchema } from '../schemas/cli-json.js';
import { importPayload } from '../services/import.js';

export async function registerImportRoute(app: FastifyInstance, db: Database): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    '/api/import',
    {
      schema: {
        body: ImportPayloadSchema,
      },
    },
    async (req) => importPayload(db, req.body),
  );
}
