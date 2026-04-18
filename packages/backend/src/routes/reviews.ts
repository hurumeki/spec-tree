import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Database } from 'better-sqlite3';
import { ReviewStatusSchema } from '../schemas/common.js';
import { listReviews } from '../services/reviews.js';

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
}
