import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { apiPut } from '../api/client';
import type { EdgeStatus, NodeDetail as NodeDetailT, NodeStatus, Priority } from '../api/types';
import Badge from '../components/Badge';

interface EditState {
  title: string;
  content: string;
  tags: string;
  priority: Priority;
  status: NodeStatus;
  change_reason: string;
}

const NodeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, refetch } = useApi<NodeDetailT>(id ? `/api/nodes/${id}` : null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setEdit({
        title: data.title,
        content: data.content,
        tags: data.tags.join(', '),
        priority: data.priority,
        status: data.status,
        change_reason: '',
      });
    }
  }, [data]);

  if (!id) return <p className="error">Missing node id.</p>;
  if (loading) return <p>Loading…</p>;
  if (error) return <p className="error">{error.message}</p>;
  if (!data || !edit) return <p>Node not found.</p>;

  const contentChanged =
    edit.title !== data.title ||
    edit.content !== data.content ||
    edit.tags !== data.tags.join(', ') ||
    edit.priority !== data.priority;
  const statusChanged = edit.status !== data.status;
  const dirty = contentChanged || statusChanged;

  const save = async () => {
    setSaveError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (edit.title !== data.title) body.title = edit.title;
      if (edit.content !== data.content) body.content = edit.content;
      const nextTags = edit.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (JSON.stringify(nextTags) !== JSON.stringify(data.tags)) body.tags = nextTags;
      if (edit.priority !== data.priority) body.priority = edit.priority;
      if (edit.status !== data.status) body.status = edit.status;
      if (contentChanged && edit.change_reason) body.change_reason = edit.change_reason;
      await apiPut(`/api/nodes/${id}`, body);
      refetch();
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const updateEdgeStatus = async (edgeId: number, nextStatus: EdgeStatus) => {
    try {
      await apiPut(`/api/edges/${edgeId}`, { status: nextStatus });
      refetch();
    } catch (e) {
      setSaveError((e as Error).message);
    }
  };

  return (
    <div className="detail-layout">
      <header className="detail-header">
        <div>
          <h1>
            {data.id} <span className="muted">· v{data.current_version}</span>
          </h1>
          <p className="muted">
            <Badge kind="node-type" value={data.type} />{' '}
            <Badge kind="node-status" value={data.status} />{' '}
            <Badge kind="priority" value={data.priority} />
          </p>
        </div>
        <Link to="/" className="link-back">
          ← Back to Map
        </Link>
      </header>

      <section className="panel">
        <h2>Fields</h2>
        <label>
          Title
          <input
            type="text"
            value={edit.title}
            maxLength={30}
            onChange={(e) => setEdit({ ...edit, title: e.target.value })}
          />
        </label>
        <label>
          Content
          <textarea
            rows={6}
            value={edit.content}
            onChange={(e) => setEdit({ ...edit, content: e.target.value })}
          />
        </label>
        <label>
          Tags (comma-separated)
          <input
            type="text"
            value={edit.tags}
            onChange={(e) => setEdit({ ...edit, tags: e.target.value })}
          />
        </label>
        <div className="row">
          <label>
            Priority
            <select
              value={edit.priority}
              onChange={(e) => setEdit({ ...edit, priority: e.target.value as Priority })}
            >
              <option value="高">高</option>
              <option value="中">中</option>
              <option value="低">低</option>
            </select>
          </label>
          <label>
            Status
            <select
              value={edit.status}
              onChange={(e) => setEdit({ ...edit, status: e.target.value as NodeStatus })}
            >
              <option value="draft">draft</option>
              <option value="reviewed">reviewed</option>
              <option value="approved">approved</option>
              <option value="deprecated">deprecated</option>
            </select>
          </label>
        </div>
        {contentChanged && (
          <label>
            Change reason (required when content changes)
            <input
              type="text"
              value={edit.change_reason}
              onChange={(e) => setEdit({ ...edit, change_reason: e.target.value })}
            />
          </label>
        )}
        {saveError && <p className="error">{saveError}</p>}
        <div className="row">
          <button type="button" disabled={!dirty || saving} onClick={save}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Related edges ({data.related_edges.length})</h2>
        {data.related_edges.length === 0 ? (
          <p className="muted">No related edges.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Source → Target</th>
                <th>Relation</th>
                <th>Confidence</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.related_edges.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link to={`/nodes/${e.source_id}`}>{e.source_id}</Link> →{' '}
                    <Link to={`/nodes/${e.target_id}`}>{e.target_id}</Link>
                  </td>
                  <td>
                    <Badge kind="relation" value={e.relation_type} />
                  </td>
                  <td>{(e.confidence * 100).toFixed(0)}%</td>
                  <td>
                    <Badge kind="edge-status" value={e.status} />
                  </td>
                  <td>
                    <select
                      value={e.status}
                      onChange={(ev) => updateEdgeStatus(e.id, ev.target.value as EdgeStatus)}
                    >
                      <option value="proposed">proposed</option>
                      <option value="approved">approved</option>
                      <option value="deprecated">deprecated</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <h2>Version history</h2>
        <ol className="timeline">
          {data.versions.map((v) => (
            <li key={v.version}>
              <strong>v{v.version}</strong>{' '}
              <span className="muted">· {new Date(v.created_at).toLocaleString()}</span>
              <div>{v.title}</div>
              {v.change_reason && <div className="muted">{v.change_reason}</div>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
};

export default NodeDetailPage;
