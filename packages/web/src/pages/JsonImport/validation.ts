import type { CliPayload, NodePayload } from '../../api/types';

export const NODE_ID_RE = /^(REQ|SPEC|TC)-\d{3,}$/;
export const CR_ID_RE = /^CR-\d{3,}$/;
export const META_TYPES = ['extract', 'link', 'impact', 'bundle'] as const;

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  metaType: CliPayload['meta']['type'] | null;
  issues: ValidationIssue[];
  counts: {
    nodes: number;
    edges: number;
    reviews: number;
    suggested_new_nodes?: number;
    affected_nodes?: number;
  };
}

function checkNodeIds(nodes: NodePayload[], issues: ValidationIssue[], prefix: string) {
  nodes.forEach((n, i) => {
    if (!NODE_ID_RE.test(n.id)) {
      issues.push({ path: `${prefix}[${i}].id`, message: `Invalid node id: ${n.id}` });
    }
    if (!n.title || n.title.length > 30) {
      issues.push({
        path: `${prefix}[${i}].title`,
        message: `Title must be 1–30 chars (got ${n.title?.length ?? 0}).`,
      });
    }
  });
}

export function validatePayload(raw: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  const counts: ValidationResult['counts'] = { nodes: 0, edges: 0, reviews: 0 };

  if (!raw || typeof raw !== 'object') {
    return {
      ok: false,
      metaType: null,
      issues: [{ path: '', message: 'Root is not an object.' }],
      counts,
    };
  }
  const obj = raw as Record<string, unknown>;
  const meta = obj.meta as { type?: string } | undefined;
  const metaType = meta?.type as CliPayload['meta']['type'] | undefined;
  if (!metaType || !META_TYPES.includes(metaType)) {
    return {
      ok: false,
      metaType: null,
      issues: [{ path: 'meta.type', message: `meta.type must be one of ${META_TYPES.join(', ')}` }],
      counts,
    };
  }

  switch (metaType) {
    case 'extract': {
      const nodes = (obj.nodes as NodePayload[] | undefined) ?? [];
      counts.nodes = nodes.length;
      counts.reviews = (obj.reviews as unknown[] | undefined)?.length ?? 0;
      checkNodeIds(nodes, issues, 'nodes');
      break;
    }
    case 'link': {
      const edges = (obj.edges as { source_id: string; target_id: string }[] | undefined) ?? [];
      counts.edges = edges.length;
      counts.reviews = (obj.reviews as unknown[] | undefined)?.length ?? 0;
      edges.forEach((e, i) => {
        if (!NODE_ID_RE.test(e.source_id))
          issues.push({ path: `edges[${i}].source_id`, message: `Invalid id: ${e.source_id}` });
        if (!NODE_ID_RE.test(e.target_id))
          issues.push({ path: `edges[${i}].target_id`, message: `Invalid id: ${e.target_id}` });
      });
      break;
    }
    case 'bundle': {
      const nodes = (obj.nodes as NodePayload[] | undefined) ?? [];
      const edges = (obj.edges as { source_id: string; target_id: string }[] | undefined) ?? [];
      counts.nodes = nodes.length;
      counts.edges = edges.length;
      counts.reviews = (obj.reviews as unknown[] | undefined)?.length ?? 0;
      checkNodeIds(nodes, issues, 'nodes');
      edges.forEach((e, i) => {
        if (!NODE_ID_RE.test(e.source_id))
          issues.push({ path: `edges[${i}].source_id`, message: `Invalid id: ${e.source_id}` });
        if (!NODE_ID_RE.test(e.target_id))
          issues.push({ path: `edges[${i}].target_id`, message: `Invalid id: ${e.target_id}` });
      });
      break;
    }
    case 'impact': {
      const affected = (obj.affected_nodes as { node_id: string }[] | undefined) ?? [];
      const suggested =
        (obj.suggested_new_nodes as (NodePayload & { id?: string })[] | undefined) ?? [];
      counts.affected_nodes = affected.length;
      counts.suggested_new_nodes = suggested.length;
      counts.reviews = (obj.reviews as unknown[] | undefined)?.length ?? 0;
      const cr = obj.change_request as { id?: string } | undefined;
      if (cr?.id && !CR_ID_RE.test(cr.id)) {
        issues.push({ path: 'change_request.id', message: `Invalid CR id: ${cr.id}` });
      }
      affected.forEach((a, i) => {
        if (!NODE_ID_RE.test(a.node_id))
          issues.push({
            path: `affected_nodes[${i}].node_id`,
            message: `Invalid id: ${a.node_id}`,
          });
      });
      suggested.forEach((s, i) => {
        if (s.id && !NODE_ID_RE.test(s.id))
          issues.push({ path: `suggested_new_nodes[${i}].id`, message: `Invalid id: ${s.id}` });
      });
      break;
    }
  }

  return { ok: issues.length === 0, metaType, issues, counts };
}
