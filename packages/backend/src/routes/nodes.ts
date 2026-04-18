import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Database } from 'better-sqlite3';
import {
  NodeIdSchema,
  NodeStatusSchema,
  NodeTypeSchema,
  PrioritySchema,
} from '../schemas/common.js';
import { getNodeDetail, listNodes, updateNode } from '../services/nodes.js';

export async function registerNodeRoutes(app: FastifyInstance, db: Database): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    '/api/nodes',
    {
      schema: {
        querystring: z.object({
          type: NodeTypeSchema.optional(),
          status: NodeStatusSchema.optional(),
          q: z.string().optional(),
        }),
      },
    },
    async (req) => ({ nodes: listNodes(db, req.query) }),
  );

  typed.get(
    '/api/nodes/:id',
    {
      schema: {
        params: z.object({ id: NodeIdSchema }),
      },
    },
    async (req, reply) => {
      const detail = getNodeDetail(db, req.params.id);
      if (!detail) return reply.code(404).send({ error: 'not_found' });
      return detail;
    },
  );

  typed.put(
    '/api/nodes/:id',
    {
      schema: {
        params: z.object({ id: NodeIdSchema }),
        body: z
          .object({
            status: NodeStatusSchema.optional(),
            title: z.string().min(1).max(30).optional(),
            content: z.string().optional(),
            tags: z.array(z.string()).optional(),
            priority: PrioritySchema.optional(),
            change_reason: z.string().optional(),
          })
          .refine((v) => Object.keys(v).length > 0, {
            message: 'At least one field is required.',
          }),
      },
    },
    async (req, reply) => {
      try {
        return updateNode(db, req.params.id, req.body);
      } catch (err) {
        const e = err as Error & { statusCode?: number };
        if (e.statusCode === 404) return reply.code(404).send({ error: 'not_found' });
        throw err;
      }
    },
  );
}
