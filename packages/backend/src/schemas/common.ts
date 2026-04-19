import { z } from 'zod';

// ID prefix glossary — docs/README.md
export const NodeIdSchema = z.string().regex(/^(REQ|SPEC|TC)-\d{3,}$/, {
  message: 'Expected REQ-###, SPEC-###, or TC-### node ID.',
});
export const ChangeRequestIdSchema = z.string().regex(/^CR-\d{3,}$/, {
  message: 'Expected CR-### change-request ID.',
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

export const EdgePayloadSchema = z.object({
  source_id: NodeIdSchema,
  target_id: NodeIdSchema,
  relation_type: RelationTypeSchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
});
export type EdgePayload = z.infer<typeof EdgePayloadSchema>;

export const ReviewPayloadSchema = z.object({
  node_id: NodeIdSchema.optional(),
  edge_id: z.number().int().nonnegative().optional(),
  cr_id: ChangeRequestIdSchema.optional(),
  severity: ReviewSeveritySchema,
  category: z.string().min(1),
  message: z.string().min(1),
});
export type ReviewPayload = z.infer<typeof ReviewPayloadSchema>;
