# 3. JSON Exchange Formats

- **Spec version:** 1.0
- **Source chapter:** 3. JSON交換フォーマット
- **Purpose:** Defines the six JSON shapes used to pass data between the CLI and the Web UI. Cross-references [Data Model](./02-data-model.md) for node/edge fields.

The CLI and Web UI exchange data as JSON files. Six formats are defined. Each format that carries `reviews[]` lands in the [`reviews` table](./02-data-model.md#27-reviews-table) on import, tagged with the originating `meta.type` as `source_type`.

## 3.1 Structured-extraction result — `extract_result.json`

Contains nodes extracted from a document plus AI review findings.

| Field                 | Description                                    |
| :-------------------- | :--------------------------------------------- |
| **meta.type**         | Fixed: `"extract"`.                            |
| **meta.source_file**  | File name of the input document.               |
| **meta.doc_type**     | `requirement` / `specification` / `test_case`. |
| **meta.generated_at** | Generation timestamp (ISO 8601).               |
| **nodes[]**           | Array of extracted nodes.                      |
| **reviews[]**         | Array of AI review findings.                   |

## 3.2 Link result — `link_result.json`

Contains inferred edges between nodes.

| Field               | Description                                                      |
| :------------------ | :--------------------------------------------------------------- |
| **meta.type**       | Fixed: `"link"`.                                                 |
| **meta.node_count** | Number of input nodes.                                           |
| **edges[]**         | Array of inferred edges (includes `confidence` and `reasoning`). |

## 3.3 Impact-analysis result — `impact_result.json`

Contains the result of analyzing a specification change.

| Field                     | Description                                                          |
| :------------------------ | :------------------------------------------------------------------- |
| **meta.type**             | Fixed: `"impact"`.                                                   |
| **meta.change_document**  | File name of the change document.                                    |
| **change_summary**        | Summary of the change.                                               |
| **affected_nodes[]**      | Affected nodes (`node_id`, `impact_description`, `required_action`). |
| **suggested_new_nodes[]** | New-node proposals from the AI.                                      |
| **reviews[]**             | AI review findings.                                                  |

## 3.4 Bundle — `bundle.json`

A single-file aggregate used during initial import.

| Field                   | Description                        |
| :---------------------- | :--------------------------------- |
| **meta.type**           | Fixed: `"bundle"`.                 |
| **meta.source_files[]** | File names of all input documents. |
| **nodes[]**             | All nodes.                         |
| **edges[]**             | All edges.                         |
| **reviews[]**           | All review findings.               |

## 3.5 DB export — `db_snapshot.json`

Full-database snapshot exported from the Web UI. Used by the CLI as context during impact analysis.

| Field                | Description                              |
| :------------------- | :--------------------------------------- |
| **meta.type**        | Fixed: `"snapshot"`.                     |
| **meta.exported_at** | Export timestamp.                        |
| **nodes[]**          | All nodes (with latest-version content). |
| **edges[]**          | All edges (including `deprecated`).      |

## 3.6 Review result — `review_result.json`

Output of the `review.md` prompt. Contains AI-generated quality findings over the full set of nodes and edges. Consumed locally by the CLI (e.g. merged into `bundle.json` via `jq`) rather than POSTed directly to the API.

| Field                 | Description                      |
| :-------------------- | :------------------------------- |
| **meta.type**         | Fixed: `"review"`.               |
| **meta.generated_at** | Generation timestamp (ISO 8601). |
| **reviews[]**         | Array of AI review findings.     |
