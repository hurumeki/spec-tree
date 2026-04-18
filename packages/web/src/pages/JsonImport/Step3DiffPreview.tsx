import { useMemo, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import type { NodePayload, NodeSummary, Priority, ReviewPayload } from '../../api/types';
import Badge from '../../components/Badge';

export interface Step3Props {
  parsed: unknown;
  onBack: () => void;
  onSubmit: (edited: unknown) => void;
  submitting: boolean;
}

type DiffKind = 'add' | 'update' | 'unchanged';

interface NodeRow {
  node: NodePayload;
  kind: DiffKind;
}

function collectNodes(parsed: unknown): NodePayload[] {
  if (!parsed || typeof parsed !== 'object') return [];
  const obj = parsed as Record<string, unknown>;
  const meta = obj.meta as { type?: string } | undefined;
  if (meta?.type === 'extract' || meta?.type === 'bundle') {
    return (obj.nodes as NodePayload[] | undefined) ?? [];
  }
  return [];
}

function collectReviews(parsed: unknown): ReviewPayload[] {
  if (!parsed || typeof parsed !== 'object') return [];
  const obj = parsed as Record<string, unknown>;
  return (obj.reviews as ReviewPayload[] | undefined) ?? [];
}

function samePayloadAsDb(
  payload: NodePayload,
  existing: NodeSummary | undefined,
): 'add' | 'unchanged' | 'update' {
  if (!existing) return 'add';
  if (existing.title !== payload.title) return 'update';
  if (existing.priority !== payload.priority) return 'update';
  if (JSON.stringify(existing.tags) !== JSON.stringify(payload.tags)) return 'update';
  // Content isn't in NodeSummary, so we conservatively treat it as "update".
  return 'update';
}

const Step3DiffPreview = ({ parsed, onBack, onSubmit, submitting }: Step3Props) => {
  const existing = useApi<{ nodes: NodeSummary[] }>('/api/nodes');
  const initialNodes = useMemo(() => collectNodes(parsed), [parsed]);
  const reviews = useMemo(() => collectReviews(parsed), [parsed]);
  const [editedNodes, setEditedNodes] = useState<NodePayload[]>(initialNodes);

  const rows: NodeRow[] = useMemo(() => {
    if (!existing.data) return editedNodes.map((n) => ({ node: n, kind: 'add' }));
    const byId = new Map(existing.data.nodes.map((n) => [n.id, n]));
    return editedNodes.map((n) => ({ node: n, kind: samePayloadAsDb(n, byId.get(n.id)) }));
  }, [existing.data, editedNodes]);

  const updateField = <K extends keyof NodePayload>(
    index: number,
    key: K,
    value: NodePayload[K],
  ) => {
    setEditedNodes((prev) => prev.map((n, i) => (i === index ? { ...n, [key]: value } : n)));
  };

  const submit = () => {
    if (!parsed || typeof parsed !== 'object') return onSubmit(parsed);
    const obj = parsed as Record<string, unknown>;
    const meta = obj.meta as { type?: string } | undefined;
    if (meta?.type === 'extract' || meta?.type === 'bundle') {
      onSubmit({ ...obj, nodes: editedNodes });
    } else {
      onSubmit(parsed);
    }
  };

  const counts = useMemo(() => {
    const c = { add: 0, update: 0, unchanged: 0 };
    for (const r of rows) c[r.kind] += 1;
    return c;
  }, [rows]);

  return (
    <div className="wizard-step">
      <h2>Step 3 — Diff preview</h2>
      <p className="muted">
        {counts.add} added · {counts.update} updated · {counts.unchanged} unchanged
      </p>

      {editedNodes.length > 0 && (
        <table className="table diff-table">
          <thead>
            <tr>
              <th>Change</th>
              <th>ID</th>
              <th>Title</th>
              <th>Content</th>
              <th>Tags</th>
              <th>Priority</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.node.id} className={`diff-row diff-${r.kind}`}>
                <td>{r.kind}</td>
                <td>
                  <code>{r.node.id}</code>
                </td>
                <td>
                  <input
                    type="text"
                    value={r.node.title}
                    maxLength={30}
                    onChange={(e) => updateField(i, 'title', e.target.value)}
                  />
                </td>
                <td>
                  <textarea
                    rows={2}
                    value={r.node.content}
                    onChange={(e) => updateField(i, 'content', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={r.node.tags.join(', ')}
                    onChange={(e) =>
                      updateField(
                        i,
                        'tags',
                        e.target.value
                          .split(',')
                          .map((t) => t.trim())
                          .filter(Boolean),
                      )
                    }
                  />
                </td>
                <td>
                  <select
                    value={r.node.priority}
                    onChange={(e) => updateField(i, 'priority', e.target.value as Priority)}
                  >
                    <option value="高">高</option>
                    <option value="中">中</option>
                    <option value="低">低</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {reviews.length > 0 && (
        <>
          <h3>AI findings ({reviews.length})</h3>
          <ul className="issue-list">
            {reviews.map((r, i) => (
              <li key={i} className={`severity-${r.severity}`}>
                <Badge kind="severity" value={r.severity} /> <code>{r.category}</code>
                {r.node_id && ` · ${r.node_id}`}
                {r.cr_id && ` · ${r.cr_id}`}
                <div>{r.message}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="row">
        <button type="button" onClick={onBack}>
          ← Back
        </button>
        <button type="button" onClick={submit} disabled={submitting}>
          {submitting ? 'Importing…' : 'Import →'}
        </button>
      </div>
    </div>
  );
};

export default Step3DiffPreview;
