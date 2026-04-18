import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { apiPut } from '../api/client';
import type { ImpactResponse, Review } from '../api/types';
import GraphView, { type GraphEdge, type GraphNode } from '../components/GraphView';
import ReviewList from '../components/ReviewList';

const DEPTH_COLORS: Record<number, string> = {
  0: '#E24B4A',
  1: '#EF9F27',
};
const FALLBACK_COLOR = '#FAEEDA';
const NEW_COLOR = '#639922';

function styleFor(depth: number) {
  if (depth === 0) return { color: '#E24B4A', borderWidth: 3, textColor: '#fff' };
  if (depth === 1) return { color: '#EF9F27', borderWidth: 2, textColor: '#111' };
  return { color: FALLBACK_COLOR, borderWidth: 1, textColor: '#444' };
}

const ImpactViewPage = () => {
  const { crId } = useParams<{ crId: string }>();
  const impact = useApi<ImpactResponse>(crId ? `/api/impact/${crId}` : null);
  const reviewsResp = useApi<{ reviews: Review[] }>('/api/reviews?status=unresolved');

  const crReviews = useMemo(
    () => (reviewsResp.data?.reviews ?? []).filter((r) => r.cr_id === crId),
    [reviewsResp.data, crId],
  );

  const { graphNodes, graphEdges } = useMemo(() => {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    if (!impact.data) return { graphNodes: nodes, graphEdges: edges };
    const all = [...impact.data.direct, ...impact.data.transitive];
    const seen = new Set<string>();
    for (const row of all) {
      if (seen.has(row.node_id)) continue;
      seen.add(row.node_id);
      const style = styleFor(row.depth);
      nodes.push({
        id: row.node_id,
        label: `${row.node_id}\nd=${row.depth}`,
        color: style.color,
        borderColor: '#4b1f1f',
        borderWidth: style.borderWidth,
        textColor: style.textColor,
      });
    }
    // Build edges from path strings like "A -> B -> C".
    for (const row of all) {
      if (!row.path) continue;
      const chain = row.path.split(' -> ');
      for (let i = 0; i < chain.length - 1; i++) {
        const a = chain[i];
        const b = chain[i + 1];
        if (!a || !b) continue;
        const id = `p:${a}->${b}`;
        if (!edges.find((e) => e.id === id)) {
          edges.push({ id, source: a, target: b });
        }
      }
    }
    return { graphNodes: nodes, graphEdges: edges };
  }, [impact.data]);

  if (!crId) return <p className="error">Missing change-request id.</p>;
  if (impact.loading) return <p>Loading impact…</p>;
  if (impact.error) return <p className="error">{impact.error.message}</p>;
  if (!impact.data) return <p>Change request not found.</p>;

  const cr = impact.data.change_request;

  const decide = async (nodeId: string, status: 'approved' | 'deprecated') => {
    try {
      await apiPut(`/api/nodes/${nodeId}`, { status });
      impact.refetch();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="impact-layout">
      <header className="impact-header">
        <div>
          <h1>{cr.id}</h1>
          <h2>{cr.title}</h2>
          <p>{cr.description}</p>
          <p className="muted">
            status: {cr.status}
            {cr.source_document ? ` · source: ${cr.source_document}` : ''}
          </p>
        </div>
        <Link to="/" className="link-back">
          ← Back to Map
        </Link>
      </header>

      <section className="panel legend">
        <span className="legend-chip" style={{ background: DEPTH_COLORS[0] }}>
          direct (d=0)
        </span>
        <span className="legend-chip" style={{ background: DEPTH_COLORS[1] }}>
          d=1
        </span>
        <span className="legend-chip" style={{ background: FALLBACK_COLOR }}>
          d≥2
        </span>
        <span className="legend-chip legend-new" style={{ borderColor: NEW_COLOR }}>
          new (dashed)
        </span>
      </section>

      <div className="impact-main">
        <section className="panel impact-graph">
          <h2>Impact graph</h2>
          {graphNodes.length === 0 ? (
            <p className="muted">No impact rows to display.</p>
          ) : (
            <GraphView nodes={graphNodes} edges={graphEdges} layout="breadthfirst" height={500} />
          )}
        </section>

        <aside className="impact-side">
          <section className="panel">
            <h2>Direct ({impact.data.direct.length})</h2>
            <ul className="impact-list">
              {impact.data.direct.map((r) => (
                <li key={r.node_id}>
                  <Link to={`/nodes/${r.node_id}`}>{r.node_id}</Link>
                  {r.analysis && <p className="muted">{r.analysis}</p>}
                  <div className="row">
                    <button type="button" onClick={() => decide(r.node_id, 'approved')}>
                      Accept
                    </button>
                    <button type="button" onClick={() => decide(r.node_id, 'deprecated')}>
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <h2>Transitive ({impact.data.transitive.length})</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Node</th>
                  <th>Depth</th>
                  <th>Path</th>
                </tr>
              </thead>
              <tbody>
                {impact.data.transitive.map((r) => (
                  <tr key={r.node_id}>
                    <td>
                      <Link to={`/nodes/${r.node_id}`}>{r.node_id}</Link>
                    </td>
                    <td>{r.depth}</td>
                    <td className="muted">{r.path ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="panel">
            <h2>AI findings for {cr.id}</h2>
            <ReviewList reviews={crReviews} emptyMessage="No unresolved findings for this CR." />
          </section>
        </aside>
      </div>
    </div>
  );
};

export default ImpactViewPage;
