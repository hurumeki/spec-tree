import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Database } from 'better-sqlite3';
import { ChangeRequestIdSchema } from '../schemas/common.js';
import { getImpact } from '../services/impact.js';

export async function registerImpactRoute(app: FastifyInstance, db: Database): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  typed.get(
    '/api/impact/:cr_id',
    {
      schema: {
        params: z.object({ cr_id: ChangeRequestIdSchema }),
      },
    },
    async (req, reply) => {
      const result = getImpact(db, req.params.cr_id);
      if (!result) return reply.code(404).send({ error: 'not_found' });
      return result;
    },
  );
}
