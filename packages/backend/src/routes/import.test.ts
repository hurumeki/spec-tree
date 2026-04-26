import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Database } from '../db/index.js';
import { makeApp, seedBaseNodes } from './test-helpers.js';

describe('POST /api/import', () => {
  let app: FastifyInstance;
  let db: Database;

  beforeEach(async () => {
    ({ app, db } = await makeApp());
  });

  afterEach(async () => {
    await app.close();
    db.close();
  });

  it('imports an extract payload (creates nodes + reviews)', async () => {
    const payload = {
      meta: {
        type: 'extract',
        source_file: 'requirements.md',
        doc_type: 'requirement',
        generated_at: '2026-04-18T00:00:00.000Z',
      },
      nodes: [
        {
          id: 'REQ-001',
          type: 'requirement',
          title: 'Login',
          content: 'Users must log in.',
          tags: ['auth'],
          priority: 'high',
        },
      ],
      reviews: [{ node_id: 'REQ-001', severity: 'info', category: 'style', message: 'Looks fine' }],
    };
    const res = await app.inject({ method: 'POST', url: '/api/import', payload });
    expect(res.statusCode).toBe(200);
    const summary = res.json();
    expect(summary.type).toBe('extract');
    expect(summary.nodes.created).toBe(1);
    expect(summary.reviews).toBe(1);

    const nodeCount = (db.prepare('SELECT COUNT(*) AS c FROM nodes').get() as { c: number }).c;
    expect(nodeCount).toBe(1);
    const reviewCount = (db.prepare('SELECT COUNT(*) AS c FROM reviews').get() as { c: number }).c;
    expect(reviewCount).toBe(1);
  });

  it('re-importing the same extract bumps version only on content change', async () => {
    const base = {
      id: 'REQ-001',
      type: 'requirement',
      title: 'Login',
      content: 'v1',
      tags: [],
      priority: 'high',
    };
    const mkPayload = (node: typeof base) => ({
      meta: {
        type: 'extract',
        source_file: 'r.md',
        doc_type: 'requirement',
        generated_at: '2026-04-18T00:00:00.000Z',
      },
      nodes: [node],
      reviews: [],
    });
    await app.inject({ method: 'POST', url: '/api/import', payload: mkPayload(base) });
    const same = await app.inject({ method: 'POST', url: '/api/import', payload: mkPayload(base) });
    expect(same.json().nodes).toEqual({ created: 0, updated: 0, unchanged: 1 });
    const changed = await app.inject({
      method: 'POST',
      url: '/api/import',
      payload: mkPayload({ ...base, content: 'v2' }),
    });
    expect(changed.json().nodes).toEqual({ created: 0, updated: 1, unchanged: 0 });
    const versions = db
      .prepare('SELECT COUNT(*) AS c FROM node_versions WHERE node_id = ?')
      .get('REQ-001') as { c: number };
    expect(versions.c).toBe(2);
  });

  it('imports a link payload (inserts edges with proposed status + history)', async () => {
    seedBaseNodes(db);
    const payload = {
      meta: { type: 'link', node_count: 4 },
      edges: [
        {
          source_id: 'SPEC-001',
          target_id: 'TC-001',
          relation_type: 'verifies',
          confidence: 0.92,
          reasoning: 'Direct match',
        },
      ],
      reviews: [],
    };
    const res = await app.inject({ method: 'POST', url: '/api/import', payload });
    expect(res.json().edges.created).toBe(1);
    const row = db
      .prepare(
        `SELECT status FROM edges WHERE source_id='SPEC-001' AND target_id='TC-001' AND relation_type='verifies'`,
      )
      .get() as { status: string };
    expect(row.status).toBe('proposed');
    const hist = db.prepare(`SELECT action FROM edge_history ORDER BY id DESC LIMIT 1`).get() as {
      action: string;
    };
    expect(hist.action).toBe('created');
  });

  it('imports an impact payload and persists direct change_impacts + CR', async () => {
    seedBaseNodes(db);
    const payload = {
      meta: {
        type: 'impact',
        change_document: 'change.md',
      },
      change_summary: 'Password policy tightened',
      affected_nodes: [
        {
          node_id: 'SPEC-001',
          impact_description: 'Password rule must be stricter',
        },
      ],
      suggested_new_nodes: [
        {
          type: 'specification',
          title: 'Lockout rule',
          content: 'Lock after 5 failures.',
          tags: [],
          priority: 'middle',
        },
      ],
      reviews: [],
    };
    const res = await app.inject({ method: 'POST', url: '/api/import', payload });
    const summary = res.json();
    expect(summary.change_request_id).toMatch(/^CR-\d{3,}$/);
    expect(summary.affected_node_ids).toEqual(['SPEC-001']);
    expect(summary.suggested_new_node_ids).toHaveLength(1);

    const impacts = db.prepare(`SELECT impact_type, depth FROM change_impacts`).all() as {
      impact_type: string;
      depth: number;
    }[];
    expect(impacts).toEqual([{ impact_type: 'direct', depth: 0 }]);
  });

  it('imports a bundle (nodes + edges together)', async () => {
    const payload = {
      meta: { type: 'bundle', source_files: ['r.md', 's.md'] },
      nodes: [
        {
          id: 'REQ-001',
          type: 'requirement',
          title: 'R1',
          content: 'c',
          tags: [],
          priority: 'high',
        },
        {
          id: 'SPEC-001',
          type: 'specification',
          title: 'S1',
          content: 'c',
          tags: [],
          priority: 'middle',
        },
      ],
      edges: [
        {
          source_id: 'REQ-001',
          target_id: 'SPEC-001',
          relation_type: 'realizes',
          confidence: 0.8,
          reasoning: 'REQ-001 is realised by SPEC-001',
        },
      ],
      reviews: [],
    };
    const res = await app.inject({ method: 'POST', url: '/api/import', payload });
    expect(res.json().nodes.created).toBe(2);
    expect(res.json().edges.created).toBe(1);
  });

  it('rejects payloads with an unknown meta.type', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/import',
      payload: { meta: { type: 'nonsense' }, nodes: [] },
    });
    expect(res.statusCode).toBe(400);
  });
});
