import { z } from 'zod';
import {
  ChangeRequestIdSchema,
  EdgePayloadSchema,
  NodeIdSchema,
  NodePayloadSchema,
  NodeTypeSchema,
  ReviewPayloadSchema,
} from './common.js';

// Shapes follow docs/03-json-formats.md §3.1 – 3.5.

const IsoDateTimeSchema = z.string().datetime();

// §3.1 extract_result.json
export const ExtractResultSchema = z.object({
  meta: z.object({
    type: z.literal('extract'),
    source_file: z.string(),
    doc_type: NodeTypeSchema,
    generated_at: IsoDateTimeSchema,
  }),
  nodes: z.array(NodePayloadSchema),
  reviews: z.array(ReviewPayloadSchema).default([]),
});
export type ExtractResult = z.infer<typeof ExtractResultSchema>;

// §3.2 link_result.json
export const LinkResultSchema = z.object({
  meta: z.object({
    type: z.literal('link'),
    node_count: z.number().int().nonnegative(),
    generated_at: IsoDateTimeSchema.optional(),
  }),
  edges: z.array(EdgePayloadSchema),
  reviews: z.array(ReviewPayloadSchema).default([]),
});
export type LinkResult = z.infer<typeof LinkResultSchema>;

// §3.3 impact_result.json
export const SuggestedNewNodeSchema = NodePayloadSchema.omit({ id: true }).extend({
  // AI may omit an ID; server will mint one. If supplied, keep it.
  id: NodeIdSchema.optional(),
});
export const AffectedNodeSchema = z.object({
  node_id: NodeIdSchema,
  impact_description: z.string(),
  required_action: z.string().optional(),
});
export const ImpactResultSchema = z.object({
  meta: z.object({
    type: z.literal('impact'),
    change_document: z.string(),
    generated_at: IsoDateTimeSchema.optional(),
  }),
  change_request: z
    .object({
      id: ChangeRequestIdSchema.optional(),
      title: z.string(),
      description: z.string(),
      source_document: z.string().optional(),
    })
    .optional(),
  change_summary: z.string(),
  affected_nodes: z.array(AffectedNodeSchema),
  suggested_new_nodes: z.array(SuggestedNewNodeSchema).default([]),
  reviews: z.array(ReviewPayloadSchema).default([]),
});
export type ImpactResult = z.infer<typeof ImpactResultSchema>;

// §3.4 bundle.json
export const BundleSchema = z.object({
  meta: z.object({
    type: z.literal('bundle'),
    source_files: z.array(z.string()),
    generated_at: IsoDateTimeSchema.optional(),
  }),
  nodes: z.array(NodePayloadSchema),
  edges: z.array(EdgePayloadSchema),
  reviews: z.array(ReviewPayloadSchema).default([]),
});
export type Bundle = z.infer<typeof BundleSchema>;

// §3.5 db_snapshot.json (response shape for GET /api/export)
export const SnapshotNodeSchema = NodePayloadSchema.extend({
  version: z.number().int().positive(),
  status: z.enum(['draft', 'reviewed', 'approved', 'deprecated']),
  created_at: IsoDateTimeSchema,
  updated_at: IsoDateTimeSchema,
});
export const SnapshotEdgeSchema = EdgePayloadSchema.extend({
  id: z.number().int().positive(),
  status: z.enum(['proposed', 'approved', 'deprecated']),
  created_at: IsoDateTimeSchema,
});
export const DbSnapshotSchema = z.object({
  meta: z.object({
    type: z.literal('snapshot'),
    exported_at: IsoDateTimeSchema,
  }),
  nodes: z.array(SnapshotNodeSchema),
  edges: z.array(SnapshotEdgeSchema),
});
export type DbSnapshot = z.infer<typeof DbSnapshotSchema>;

// POST /api/import accepts any of the four CLI outputs. The discriminator lives
// at meta.type, so we use a plain z.union and rely on meta.type literals inside
// each branch to identify the shape.
export const ImportPayloadSchema = z.union([
  ExtractResultSchema,
  LinkResultSchema,
  ImpactResultSchema,
  BundleSchema,
]);
export type ImportPayload = z.infer<typeof ImportPayloadSchema>;
