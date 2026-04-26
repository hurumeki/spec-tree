import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Database } from 'better-sqlite3';
import { ReviewStatusSchema } from '../schemas/common.js';
import { listReviews, updateReviewStatus } from '../services/reviews.js';

export async function registerReviewRoutes(app: FastifyInstance, db: Database): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  typed.get(
    '/api/reviews',
    {
      schema: {
        querystring: z.object({
          status: z.union([ReviewStatusSchema, z.literal('all')]).optional(),
        }),
      },
    },
    async (req) => ({ reviews: listReviews(db, req.query) }),
  );

  // docs/08-operations.md §8.3 — reviewer chooses resolved or rejected per finding.
  typed.patch(
    '/api/reviews/:id',
    {
      schema: {
        params: z.object({ id: z.coerce.number().int().positive() }),
        body: z.object({ status: z.enum(['resolved', 'rejected']) }),
      },
    },
    async (req, reply) => {
      try {
        return { review: updateReviewStatus(db, req.params.id, req.body.status) };
      } catch (err) {
        const e = err as Error & { statusCode?: number };
        if (e.statusCode === 404) return reply.code(404).send({ error: 'not_found' });
        throw err;
      }
    },
  );
}
