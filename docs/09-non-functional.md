# 9. Non-Functional Requirements

- **Spec version:** 1.0
- **Source chapter:** 9. 非機能要件
- **Purpose:** Performance targets, data-safety expectations, extensibility notes, and known constraints.

## 9.1 Performance

- Graph traversal in SQLite (recursive CTE): within a few milliseconds for ~1 MB of data.
- JSON import: within 1 second for ~100 nodes.
- UI response: page renders within 500 ms.

## 9.2 Data safety

- Regular backups of the SQLite file (`trace.db`) are recommended.
- No-physical-deletion design allows recovery from misoperation.
- Before a JSON import, the existing DB is automatically snapshotted.

## 9.3 Extensibility

- If data volume grows substantially, a migration path to a graph DB (e.g. Neo4j) is preserved.
- Adding a new node type (e.g. implementation code) requires only a new value in the `type` column.
- Adding a new relation type requires only a new value in the `relation_type` column.

## 9.4 Constraints

- Assumes local, single-user use (no concurrent editing).
- AI accuracy depends on prompt quality; prompts are expected to be improved iteratively in production.
- The Claude Code CLI requires an Anthropic API key.
