import type { Database } from 'better-sqlite3';
import { upsertImportedNode, createNode } from './nodes.js';
import { upsertImportedEdge } from './edges.js';
import { insertReviews } from './reviews.js';
import { mintChangeRequestId, mintNodeId } from './ids.js';
import type {
  Bundle,
  ExtractResult,
  ImpactResult,
  ImportPayload,
  LinkResult,
} from '../schemas/cli-json.js';

export interface ImportSummary {
  type: 'extract' | 'link' | 'impact' | 'bundle';
  nodes: { created: number; updated: number; unchanged: number };
  edges: { created: number; updated: number };
  reviews: number;
  change_request_id?: string;
  suggested_new_node_ids?: string[];
  affected_node_ids?: string[];
}

function emptySummary(type: ImportSummary['type']): ImportSummary {
  return {
    type,
    nodes: { created: 0, updated: 0, unchanged: 0 },
    edges: { created: 0, updated: 0 },
    reviews: 0,
  };
}

function importExtract(db: Database, p: ExtractResult): ImportSummary {
  const summary = emptySummary('extract');
  for (const node of p.nodes) {
    summary.nodes[upsertImportedNode(db, node)] += 1;
  }
  insertReviews(db, 'extract', p.reviews);
  summary.reviews = p.reviews.length;
  return summary;
}

function importLink(db: Database, p: LinkResult): ImportSummary {
  const summary = emptySummary('link');
  for (const edge of p.edges) {
    summary.edges[upsertImportedEdge(db, edge)] += 1;
  }
  insertReviews(db, 'link', p.reviews);
  summary.reviews = p.reviews.length;
  return summary;
}

function importBundle(db: Database, p: Bundle): ImportSummary {
  const summary = emptySummary('bundle');
  for (const node of p.nodes) {
    summary.nodes[upsertImportedNode(db, node)] += 1;
  }
  for (const edge of p.edges) {
    summary.edges[upsertImportedEdge(db, edge)] += 1;
  }
  insertReviews(db, 'bundle', p.reviews);
  summary.reviews = p.reviews.length;
  return summary;
}

function importImpact(db: Database, p: ImpactResult): ImportSummary {
  const summary = emptySummary('impact');
  const crSpec = p.change_request;
  const crId = crSpec?.id ?? mintChangeRequestId(db);
  db.prepare(
    `INSERT INTO change_requests (id, title, description, source_document, status)
     VALUES (?, ?, ?, ?, 'analyzing')
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       description = excluded.description,
       source_document = excluded.source_document`,
  ).run(
    crId,
    crSpec?.title ?? p.change_summary.slice(0, 60),
    crSpec?.description ?? p.change_summary,
    crSpec?.source_document ?? p.meta.change_document,
  );
  summary.change_request_id = crId;

  const newNodeIds: string[] = [];
  for (const sug of p.suggested_new_nodes) {
    const id = sug.id ?? mintNodeId(db, sug.type);
    createNode(db, { ...sug, id });
    newNodeIds.push(id);
    summary.nodes.created += 1;
  }
  summary.suggested_new_node_ids = newNodeIds;

  const affectedIds: string[] = [];
  const insertImpact = db.prepare(
    `INSERT INTO change_impacts (change_request_id, affected_node_id, impact_type, depth, analysis)
     VALUES (?, ?, 'direct', 0, ?)`,
  );
  for (const a of p.affected_nodes) {
    insertImpact.run(crId, a.node_id, a.impact_description);
    affectedIds.push(a.node_id);
  }
  summary.affected_node_ids = affectedIds;

  insertReviews(db, 'impact', p.reviews);
  summary.reviews = p.reviews.length;
  return summary;
}

export function importPayload(db: Database, payload: ImportPayload): ImportSummary {
  return db.transaction((): ImportSummary => {
    switch (payload.meta.type) {
      case 'extract':
        return importExtract(db, payload as ExtractResult);
      case 'link':
        return importLink(db, payload as LinkResult);
      case 'bundle':
        return importBundle(db, payload as Bundle);
      case 'impact':
        return importImpact(db, payload as ImpactResult);
    }
  })();
}
