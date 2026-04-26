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
  /** Enable Fastify request/response logging (sensitive fields redacted). */
  logger?: boolean;
  /** Allowed CORS origins. Defaults to localhost dev origins. */
  corsOrigins?: string[];
  /** When set, all /api routes (except /api/health) require Bearer auth. */
  apiToken?: string;
}

const DEFAULT_CORS_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

function resolveCorsOrigins(opt: BuildAppOptions): string[] {
  if (opt.corsOrigins && opt.corsOrigins.length > 0) return opt.corsOrigins;
  const env = process.env.CORS_ORIGINS?.trim();
  if (env) {
    return env
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return DEFAULT_CORS_ORIGINS;
}

function resolveApiToken(opt: BuildAppOptions): string | undefined {
  if (opt.apiToken !== undefined) return opt.apiToken || undefined;
  const env = process.env.API_TOKEN?.trim();
  return env ? env : undefined;
}

export async function buildApp(
  db: Database,
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    bodyLimit: 10 * 1024 * 1024, // 10 MB — CLI JSON can be large per docs/09-non-functional.md §9.1
    logger: options.logger
      ? {
          // Avoid leaking auth headers, API keys, and query strings (which may
          // carry tokens) into request logs.
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers["x-api-key"]',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
            ],
            censor: '[REDACTED]',
          },
        }
      : false,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, { origin: resolveCorsOrigins(options) });

  // Optional Bearer auth (timing-safe comparison). The system is documented as
  // local single-user (docs/09-non-functional.md §9.2), so auth is opt-in via
  // API_TOKEN; when unset, all routes remain open as before.
  const apiToken = resolveApiToken(options);
  if (apiToken) {
    app.addHook('onRequest', async (req, reply) => {
      // Allow unauthenticated health checks for liveness probes.
      if (req.url === '/api/health') return;
      if (!req.url.startsWith('/api/')) return;
      const header = req.headers.authorization;
      if (!header || !header.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'unauthorized' });
      }
      const provided = header.slice('Bearer '.length);
      if (!timingSafeEqualString(provided, apiToken)) {
        return reply.code(401).send({ error: 'unauthorized' });
      }
    });
  }

  app.get('/api/health', async (_req, reply) => {
    try {
      db.prepare('SELECT 1').get();
      return { ok: true, db: 'ok' };
    } catch {
      return reply.code(503).send({ ok: false, db: 'error' });
    }
  });

  await registerNodeRoutes(app, db);
  await registerEdgeRoutes(app, db);
  await registerImportRoute(app, db);
  await registerExportRoute(app, db);
  await registerImpactRoute(app, db);
  await registerReviewRoutes(app, db);

  return app;
}

// Constant-time string compare to avoid leaking token length / prefix via
// response timing. Inputs are ASCII tokens so byte length compare is fine.
function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
