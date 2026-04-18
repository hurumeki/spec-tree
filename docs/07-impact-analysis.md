# 7. Impact-Scope Calculation Logic

- **Spec version:** 1.0
- **Source chapter:** 7. 影響範囲計算ロジック
- **Purpose:** Defines how direct impact (from AI) and transitive impact (from graph traversal) are combined, including the reference recursive CTE and the visual encoding.

## 7.1 Processing flow

1. The AI identifies directly affected nodes (`affected_nodes` in `impact_result.json`).
2. Store the direct nodes in `change_impacts` with `impact_type = direct`.
3. From each direct node, traverse `depends_on` / `verifies` edges via a recursive CTE.
4. Store the traversed nodes with `impact_type = transitive` (recording `depth`).
5. Maximum traversal depth is 5 (configurable).

## 7.2 Recursive CTE query

```sql
WITH RECURSIVE impact(node_id, depth, path) AS (
  SELECT 'SPEC-003', 0, 'SPEC-003'
  UNION ALL
  SELECT e.target_id, i.depth + 1,
    i.path || ' -> ' || e.target_id
  FROM impact i
  JOIN edges e ON e.source_id = i.node_id
  WHERE i.depth < 5 AND e.status = 'approved'
)
SELECT * FROM impact;
```

## 7.3 Visualization

| depth | Color | Rendering |
| :---- | :---- | :-------- |
| **0 (direct)** | Red (`#E24B4A`) | Thick border, dark fill. |
| **1** | Orange (`#EF9F27`) | Normal border, medium fill. |
| **2+** | Pale orange (`#FAEEDA`) | Thin border, pale fill. |
| **New addition** | Green (`#639922`) | Dashed border. |
