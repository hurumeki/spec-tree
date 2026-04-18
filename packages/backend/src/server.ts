import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Database } from 'better-sqlite3';
import { registerNodeRoutes } from './routes/nodes.js';
import { registerEdgeRoutes } from './routes/edges.js';
import { registerImportRoute } from './routes/import.js';
import { registerExportRoute } from './routes/export.js';
import { registerImpactRoute } from './routes/impact.js';
import { registerReviewRoutes } from './routes/reviews.js';

export interface BuildAppOptions {
  logger?: boolean;
}

export async function buildApp(
  db: Database,
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: 10 * 1024 * 1024, // 10 MB — CLI JSON can be large per docs/09-non-functional.md §9.1
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, { origin: true });

  app.get('/api/health', async () => ({ ok: true }));

  await registerNodeRoutes(app, db);
  await registerEdgeRoutes(app, db);
  await registerImportRoute(app, db);
  await registerExportRoute(app, db);
  await registerImpactRoute(app, db);
  await registerReviewRoutes(app, db);

  return app;
}
