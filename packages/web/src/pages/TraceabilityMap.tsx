import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import type { Edge, NodeSummary, NodeStatus, NodeType, Review } from '../api/types';
import GraphView, { type GraphEdge, type GraphNode } from '../components/GraphView';
import ReviewList from '../components/ReviewList';

const NODE_TYPE_COLOR: Record<NodeType, string> = {
  requirement: '#dbeafe',
  specification: '#fef3c7',
  test_case: '#dcfce7',
};

const TraceabilityMap = () => {
  const navigate = useNavigate();
  const [type, setType] = useState<NodeType | ''>('');
  const [status, setStatus] = useState<NodeStatus | ''>('');
  const [q, setQ] = useState('');
  const [focusId, setFocusId] = useState<string | null>(null);

  const nodesPath = useMemo(() => {
    const p = new URLSearchParams();
    if (type) p.set('type', type);
    if (status) p.set('status', status);
    if (q) p.set('q', q);
    const qs = p.toString();
    return `/api/nodes${qs ? `?${qs}` : ''}`;
  }, [type, status, q]);

  const nodesResp = useApi<{ nodes: NodeSummary[] }>(nodesPath);
  const edgesResp = useApi<{ edges: Edge[] }>('/api/edges');
  const reviewsResp = useApi<{ reviews: Review[] }>('/api/reviews?status=unresolved');

  const nodeIds = useMemo(
    () => new Set(nodesResp.data?.nodes.map((n) => n.id) ?? []),
    [nodesResp.data],
  );
  const reviewedNodes = useMemo(() => {
    const set = new Set<string>();
    for (const r of reviewsResp.data?.reviews ?? []) {
      if (r.node_id) set.add(r.node_id);
    }
    return set;
  }, [reviewsResp.data]);

  const graphNodes: GraphNode[] = useMemo(
    () =>
      (nodesResp.data?.nodes ?? []).map((n) => {
        const hasIssue = reviewedNodes.has(n.id);
        return {
          id: n.id,
          label: `${n.id}\n${n.title}`,
          color: NODE_TYPE_COLOR[n.type],
          borderColor: hasIssue ? '#E24B4A' : '#374151',
          borderWidth: hasIssue ? 3 : 1,
        };
      }),
    [nodesResp.data, reviewedNodes],
  );

  const graphEdges: GraphEdge[] = useMemo(
    () =>
      (edgesResp.data?.edges ?? [])
        .filter((e) => nodeIds.has(e.source_id) && nodeIds.has(e.target_id))
        .map((e) => ({
          id: `e${e.id}`,
          source: e.source_id,
          target: e.target_id,
          label: e.relation_type,
          dashed: e.status === 'proposed',
        })),
    [edgesResp.data, nodeIds],
  );

  return (
    <div className="map-layout">
      <aside className="map-sidebar">
        <h2>Filters</h2>
        <label>
          Type
          <select value={type} onChange={(e) => setType(e.target.value as NodeType | '')}>
            <option value="">All</option>
            <option value="requirement">Requirement</option>
            <option value="specification">Specification</option>
            <option value="test_case">Test case</option>
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as NodeStatus | '')}>
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="reviewed">Reviewed</option>
            <option value="approved">Approved</option>
            <option value="deprecated">Deprecated</option>
          </select>
        </label>
        <label>
          Search
          <input
            type="text"
            value={q}
            placeholder="title or content"
            onChange={(e) => setQ(e.target.value)}
          />
        </label>

        <h2>AI findings</h2>
        {reviewsResp.loading && <p className="muted">Loading…</p>}
        {reviewsResp.error && <p className="error">{reviewsResp.error.message}</p>}
        {reviewsResp.data && (
          <ReviewList
            reviews={reviewsResp.data.reviews}
            onSelect={(r) => r.node_id && setFocusId(r.node_id)}
          />
        )}
      </aside>

      <main className="map-main">
        <header className="map-header">
          <h1>Traceability Map</h1>
          <p className="muted">
            {nodesResp.data?.nodes.length ?? 0} nodes · {edgesResp.data?.edges.length ?? 0} edges
          </p>
        </header>
        {nodesResp.loading && <p>Loading nodes…</p>}
        {nodesResp.error && <p className="error">{nodesResp.error.message}</p>}
        {nodesResp.data && nodesResp.data.nodes.length === 0 && (
          <p className="muted">
            No nodes match. Import CLI output via <a href="/import">Import JSON</a>.
          </p>
        )}
        {nodesResp.data && nodesResp.data.nodes.length > 0 && (
          <GraphView
            nodes={graphNodes}
            edges={graphEdges}
            layout="breadthfirst"
            onNodeClick={(id) => navigate(`/nodes/${id}`)}
            focusNodeId={focusId}
            height={600}
          />
        )}
      </main>
    </div>
  );
};

export default TraceabilityMap;
