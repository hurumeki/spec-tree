// Mirrors backend shapes from packages/backend/src/schemas and service return types.

export type NodeType = 'requirement' | 'specification' | 'test_case';
export type NodeStatus = 'draft' | 'reviewed' | 'approved' | 'deprecated';
export type Priority = '高' | '中' | '低';
export type RelationType = 'realizes' | 'verifies' | 'depends_on';
export type EdgeStatus = 'proposed' | 'approved' | 'deprecated';
export type ReviewSeverity = 'info' | 'warning' | 'error';
export type ReviewStatus = 'unresolved' | 'resolved' | 'rejected';
export type ReviewSourceType = 'extract' | 'link' | 'impact' | 'bundle';
export type ChangeRequestStatus = 'analyzing' | 'reviewed' | 'applied';

export interface NodeSummary {
  id: string;
  type: NodeType;
  status: NodeStatus;
  current_version: number;
  title: string;
  priority: Priority;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface RelatedEdge {
  id: number;
  source_id: string;
  target_id: string;
  relation_type: RelationType;
  status: EdgeStatus;
  confidence: number;
}

export interface NodeVersion {
  version: number;
  title: string;
  created_at: string;
  change_reason: string | null;
}

export interface NodeDetail extends NodeSummary {
  content: string;
  change_reason: string | null;
  version_created_at: string;
  related_edges: RelatedEdge[];
  versions: NodeVersion[];
}

export interface Edge {
  id: number;
  source_id: string;
  target_id: string;
  relation_type: RelationType;
  status: EdgeStatus;
  confidence: number;
  created_at: string;
}

export interface Review {
  id: number;
  source_type: ReviewSourceType;
  node_id: string | null;
  edge_id: number | null;
  cr_id: string | null;
  severity: ReviewSeverity;
  category: string;
  message: string;
  status: ReviewStatus;
  created_at: string;
}

export interface ImpactRow {
  node_id: string;
  depth: number;
  impact_type: 'direct' | 'transitive';
  analysis: string | null;
  path?: string;
}

export interface ImpactResponse {
  change_request: {
    id: string;
    title: string;
    description: string;
    source_document: string | null;
    status: ChangeRequestStatus;
    created_at: string;
  };
  direct: ImpactRow[];
  transitive: ImpactRow[];
}

export interface ImportSummary {
  type: ReviewSourceType;
  nodes: { created: number; updated: number; unchanged: number };
  edges: { created: number; updated: number };
  reviews: number;
  change_request_id?: string;
  suggested_new_node_ids?: string[];
  affected_node_ids?: string[];
}

// CLI JSON payloads (shapes used by the JSON Import wizard).

export interface NodePayload {
  id: string;
  type: NodeType;
  title: string;
  content: string;
  tags: string[];
  priority: Priority;
  change_reason?: string;
}

export interface EdgePayload {
  source_id: string;
  target_id: string;
  relation_type: RelationType;
  confidence: number;
  reasoning?: string;
}

export interface ReviewPayload {
  node_id?: string;
  edge_id?: number;
  cr_id?: string;
  severity: ReviewSeverity;
  category: string;
  message: string;
}

export interface ExtractPayload {
  meta: { type: 'extract'; source_file: string; doc_type: NodeType; generated_at: string };
  nodes: NodePayload[];
  reviews: ReviewPayload[];
}

export interface LinkPayload {
  meta: { type: 'link'; node_count: number; generated_at?: string };
  edges: EdgePayload[];
  reviews: ReviewPayload[];
}

export interface ImpactPayload {
  meta: { type: 'impact'; change_document: string; generated_at?: string };
  change_request?: { id?: string; title: string; description: string; source_document?: string };
  change_summary: string;
  affected_nodes: Array<{ node_id: string; impact_description: string; required_action?: string }>;
  suggested_new_nodes: Array<Omit<NodePayload, 'id'> & { id?: string }>;
  reviews: ReviewPayload[];
}

export interface BundlePayload {
  meta: { type: 'bundle'; source_files: string[]; generated_at?: string };
  nodes: NodePayload[];
  edges: EdgePayload[];
  reviews: ReviewPayload[];
}

export type CliPayload = ExtractPayload | LinkPayload | ImpactPayload | BundlePayload;
