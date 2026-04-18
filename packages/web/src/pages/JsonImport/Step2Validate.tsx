import { useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import type { NodeSummary } from '../../api/types';
import type { ValidationResult } from './validation';

export interface Step2Props {
  filename: string;
  parsed: unknown;
  validation: ValidationResult;
  onBack: () => void;
  onNext: () => void;
}

function collectIncomingIds(parsed: unknown, metaType: string | null): string[] {
  if (!parsed || typeof parsed !== 'object' || !metaType) return [];
  const obj = parsed as Record<string, unknown>;
  if (metaType === 'extract' || metaType === 'bundle') {
    const nodes = (obj.nodes as { id: string }[] | undefined) ?? [];
    return nodes.map((n) => n.id);
  }
  if (metaType === 'impact') {
    const sug = (obj.suggested_new_nodes as { id?: string }[] | undefined) ?? [];
    return sug.filter((s) => s.id).map((s) => s.id!);
  }
  return [];
}

const Step2Validate = ({ filename, parsed, validation, onBack, onNext }: Step2Props) => {
  const existing = useApi<{ nodes: NodeSummary[] }>('/api/nodes');

  const duplicates = useMemo(() => {
    if (!existing.data) return [];
    const existingIds = new Set(existing.data.nodes.map((n) => n.id));
    return collectIncomingIds(parsed, validation.metaType).filter((id) => existingIds.has(id));
  }, [existing.data, parsed, validation.metaType]);

  return (
    <div className="wizard-step">
      <h2>Step 2 — Validate</h2>
      <p>
        File: <code>{filename}</code>
      </p>
      <p>
        Detected type: <strong>{validation.metaType ?? 'unknown'}</strong>
      </p>

      <h3>Counts</h3>
      <table className="table">
        <tbody>
          <tr>
            <th>Nodes</th>
            <td>{validation.counts.nodes}</td>
          </tr>
          <tr>
            <th>Edges</th>
            <td>{validation.counts.edges}</td>
          </tr>
          <tr>
            <th>Reviews</th>
            <td>{validation.counts.reviews}</td>
          </tr>
          {validation.counts.affected_nodes !== undefined && (
            <tr>
              <th>Affected nodes</th>
              <td>{validation.counts.affected_nodes}</td>
            </tr>
          )}
          {validation.counts.suggested_new_nodes !== undefined && (
            <tr>
              <th>Suggested new nodes</th>
              <td>{validation.counts.suggested_new_nodes}</td>
            </tr>
          )}
        </tbody>
      </table>

      <h3>Issues ({validation.issues.length})</h3>
      {validation.issues.length === 0 ? (
        <p className="muted">No issues detected.</p>
      ) : (
        <ul className="issue-list">
          {validation.issues.map((iss, i) => (
            <li key={i} className="error">
              <code>{iss.path || '(root)'}</code>: {iss.message}
            </li>
          ))}
        </ul>
      )}

      <h3>Duplicates against existing DB</h3>
      {existing.loading && <p className="muted">Checking…</p>}
      {existing.error && <p className="error">{existing.error.message}</p>}
      {existing.data && duplicates.length === 0 && <p className="muted">No ID collisions.</p>}
      {duplicates.length > 0 && (
        <div>
          <p className="warn">
            These IDs already exist and will be overwritten (new version created if content
            differs):
          </p>
          <ul>
            {duplicates.map((id) => (
              <li key={id}>
                <code>{id}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="row">
        <button type="button" onClick={onBack}>
          ← Back
        </button>
        <button type="button" disabled={!validation.ok} onClick={onNext}>
          Next: preview diff →
        </button>
      </div>
    </div>
  );
};

export default Step2Validate;
