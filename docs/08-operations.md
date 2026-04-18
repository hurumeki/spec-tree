# 8. Operational Rules

- **Spec version:** 1.0
- **Source chapter:** 8. 運用ルール
- **Purpose:** Lifecycle rules for status, versioning, review workflow, and batching.

## 8.1 Status management

| Status         | Description                            | Transition trigger                                      |
| :------------- | :------------------------------------- | :------------------------------------------------------ |
| **draft**      | Just produced by AI, not yet reviewed. | Set automatically on import.                            |
| **reviewed**   | Reviewed but not yet approved.         | Reviewer marks it after inspection.                     |
| **approved**   | Approved and finalized.                | Approver confirms.                                      |
| **deprecated** | Retired (logical deletion).            | Set when a requirement is removed or a spec is retired. |

## 8.2 Versioning rules

- Increment the version by 1 every time a node's content changes.
- Retain all prior versions; never physically delete.
- Always record `change_reason`.
- Diff display compares `content` of version N−1 and N.

## 8.3 Review operations

- AI output is never promoted to `approved` without human review.
- Edges with `confidence < 0.7` are highlighted yellow in the UI and prioritized for review.
- For each AI finding (`reviews`), the reviewer must choose **resolved** or **rejected**; these values are persisted in [`reviews.status`](./02-data-model.md#27-reviews-table).
- For `suggested_new_nodes` from impact analysis, the human decides **accept** or **reject**.

## 8.4 Batching criterion

- When node count exceeds 50, split the link-inference step (`link.md`) into batches.
- Group by requirement and run the CLI multiple times, then merge results.
- A 1 MB document is expected to yield roughly 50–200 nodes.
