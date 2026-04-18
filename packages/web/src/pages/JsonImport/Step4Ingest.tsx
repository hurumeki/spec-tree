import { Link } from 'react-router-dom';
import type { ImportSummary } from '../../api/types';

export interface Step4Props {
  summary: ImportSummary;
  onReset: () => void;
}

const Step4Ingest = ({ summary, onReset }: Step4Props) => {
  return (
    <div className="wizard-step">
      <h2>Step 4 — Ingestion complete</h2>
      <p>
        Type: <strong>{summary.type}</strong>
      </p>
      <table className="table">
        <tbody>
          <tr>
            <th>Nodes created</th>
            <td>{summary.nodes.created}</td>
          </tr>
          <tr>
            <th>Nodes updated</th>
            <td>{summary.nodes.updated}</td>
          </tr>
          <tr>
            <th>Nodes unchanged</th>
            <td>{summary.nodes.unchanged}</td>
          </tr>
          <tr>
            <th>Edges created</th>
            <td>{summary.edges.created}</td>
          </tr>
          <tr>
            <th>Edges updated</th>
            <td>{summary.edges.updated}</td>
          </tr>
          <tr>
            <th>Reviews inserted</th>
            <td>{summary.reviews}</td>
          </tr>
          {summary.affected_node_ids && (
            <tr>
              <th>Affected nodes</th>
              <td>{summary.affected_node_ids.join(', ') || '—'}</td>
            </tr>
          )}
          {summary.suggested_new_node_ids && summary.suggested_new_node_ids.length > 0 && (
            <tr>
              <th>Suggested new nodes</th>
              <td>{summary.suggested_new_node_ids.join(', ')}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="row">
        {summary.change_request_id && (
          <Link to={`/impact/${summary.change_request_id}`} className="button-like">
            View impact for {summary.change_request_id} →
          </Link>
        )}
        <Link to="/" className="button-like">
          Open Traceability Map
        </Link>
        <button type="button" onClick={onReset}>
          Import another
        </button>
      </div>
    </div>
  );
};

export default Step4Ingest;
