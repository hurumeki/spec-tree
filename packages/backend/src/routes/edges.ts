import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Database } from 'better-sqlite3';
import { EdgeStatusSchema, NodeIdSchema, RelationTypeSchema } from '../schemas/common.js';
import { listEdges, updateEdge } from '../services/edges.js';

export async function registerEdgeRoutes(app: FastifyInstance, db: Database): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    '/api/edges',
    {
      schema: {
        querystring: z.object({
          status: EdgeStatusSchema.optional(),
          relation_type: RelationTypeSchema.optional(),
          source_id: NodeIdSchema.optional(),
          target_id: NodeIdSchema.optional(),
        }),
      },
    },
    async (req) => ({ edges: listEdges(db, req.query) }),
  );

  typed.put(
    '/api/edges/:id',
    {
      schema: {
        params: z.object({ id: z.coerce.number().int().positive() }),
        body: z.object({
          status: EdgeStatusSchema,
          reason: z.string().optional(),
        }),
      },
    },
    async (req, reply) => {
      try {
        return updateEdge(db, req.params.id, req.body);
      } catch (err) {
        const e = err as Error & { statusCode?: number };
        if (e.statusCode === 404) return reply.code(404).send({ error: 'not_found' });
        throw err;
      }
    },
  );
}
