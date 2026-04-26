import { z } from 'zod';

// ID prefix glossary — docs/02-data-model.md §2.1, §2.8 (zero-padded 3-digit sequence).
export const NodeIdSchema = z.string().regex(/^(REQ|SPEC|TC)-\d{3}$/, {
  message: 'Expected REQ-NNN, SPEC-NNN, or TC-NNN node ID (3-digit zero-padded).',
});
export const ChangeRequestIdSchema = z.string().regex(/^CR-\d{3}$/, {
  message: 'Expected CR-NNN change-request ID (3-digit zero-padded).',
});

export const NodeTypeSchema = z.enum(['requirement', 'specification', 'test_case']);
export const NodeStatusSchema = z.enum(['draft', 'reviewed', 'approved', 'deprecated']);
export const PrioritySchema = z.enum(['high', 'middle', 'low']);
export const RelationTypeSchema = z.enum(['realizes', 'verifies', 'depends_on']);
export const EdgeStatusSchema = z.enum(['proposed', 'approved', 'deprecated']);
export const ChangeRequestStatusSchema = z.enum(['analyzing', 'reviewed', 'applied']);
export const ImpactTypeSchema = z.enum(['direct', 'transitive']);
export const ReviewSeveritySchema = z.enum(['info', 'warning', 'error']);
export const ReviewStatusSchema = z.enum(['unresolved', 'resolved', 'rejected']);
export const ReviewSourceTypeSchema = z.enum(['extract', 'link', 'impact', 'bundle']);

export const NodePayloadSchema = z.object({
  id: NodeIdSchema,
  type: NodeTypeSchema,
  title: z.string().min(1).max(30),
  content: z.string(),
  tags: z.array(z.string()).default([]),
  priority: PrioritySchema,
  change_reason: z.string().optional(),
});
export type NodePayload = z.infer<typeof NodePayloadSchema>;

// docs/04-ai-processing.md §4.3.1 — reasoning is required (1 sentence rationale).
// Self-loop and duplicate-edge constraints live at the array level
// (LinkResultSchema / BundleSchema in cli-json.ts) so EdgePayloadSchema can
// still be `.extend()`ed for snapshot rows.
export const EdgePayloadSchema = z.object({
  source_id: NodeIdSchema,
  target_id: NodeIdSchema,
  relation_type: RelationTypeSchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
});
export type EdgePayload = z.infer<typeof EdgePayloadSchema>;

// docs/02-data-model.md §2.7 — exactly one of node_id / edge_id / cr_id is set.
export const ReviewPayloadSchema = z
  .object({
    node_id: NodeIdSchema.optional(),
    edge_id: z.number().int().nonnegative().optional(),
    cr_id: ChangeRequestIdSchema.optional(),
    severity: ReviewSeveritySchema,
    category: z.string().min(1),
    message: z.string().min(1),
  })
  .superRefine((review, ctx) => {
    const set = [review.node_id, review.edge_id, review.cr_id].filter(
      (v) => v !== undefined && v !== null,
    ).length;
    if (set !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'review must reference exactly one of node_id, edge_id, or cr_id',
        path: ['node_id'],
      });
    }
  });
export type ReviewPayload = z.infer<typeof ReviewPayloadSchema>;
