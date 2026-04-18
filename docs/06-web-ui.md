# 6. Web UI Specifications

- **Spec version:** 1.0
- **Source chapter:** 6. Web UI仕様
- **Purpose:** Defines the four screens, the JSON-import wizard, the Impact view, and the REST API between frontend and backend.

## 6.1 Screen catalog

| Screen               | Primary users | Function                                                                                                                |
| :------------------- | :------------ | :---------------------------------------------------------------------------------------------------------------------- |
| **Traceability Map** | PM, QA        | Tree view of Requirement → Specification → Test; search, filter, highlight AI findings.                                 |
| **Node Detail**      | PM, QA        | All fields of a node, related-node list, change-history timeline.                                                       |
| **Impact View**      | PM            | Result of specification-change analysis; color coding of direct vs. chained impact; accept / reject new-node proposals. |
| **JSON Import**      | PM, QA        | Ingest CLI JSON: validate, preview diff, approve.                                                                       |

## 6.2 JSON-Import screen

The core intake function: CLI-produced JSON is brought into the Web UI. Designed as a four-step wizard.

### 6.2.1 Step 1 — File selection

- Supports three input methods: drag-and-drop, file-open dialog, and pointing at the CLI output directory.
- **Watch mode:** with `--watch`, monitor `output/` and auto-open the validation screen when new JSON appears.

### 6.2.2 Step 2 — Validation

- JSON syntax check.
- Discriminate by `meta.type` (`extract` / `link` / `impact` / `bundle`).
- Presence check for required fields.
- ID-format compliance (`REQ`/`SPEC`/`TC-NNN`).
- Duplicate-ID detection against the existing DB (overwrite confirmation).

### 6.2.3 Step 3 — Diff preview

- Tabular, color-coded listing of rows to be added / updated / deleted.
- Display AI findings.
- Allow per-node editing inline.

### 6.2.4 Step 4 — Ingestion

- Write to SQLite.
- Versioning: updating an existing node creates a new version.
- Provisional edges are registered with `status = proposed`.

## 6.3 Impact View

Shows the result of a specification-change analysis. Direct impact is red, chained impact is orange; `depth` expresses how remote the impact is.

- **Direct impact (`depth = 0`)**: the node the AI identified as directly affected. Red.
- **Chained impact (`depth ≥ 1`)**: indirectly affected nodes discovered by graph traversal. Orange; fades with increasing depth.
- **New-addition candidate:** a node proposed by the AI. Green dashed outline with **Accept** / **Reject** buttons.
- **AI findings:** additional quality issues detected during impact analysis.

## 6.4 REST API

| Endpoint               | Method  | Function                                                     |
| :--------------------- | :------ | :----------------------------------------------------------- |
| **/api/import**        | POST    | Ingest a JSON file (validate + store).                       |
| **/api/export**        | GET     | Export a DB snapshot.                                        |
| **/api/nodes**         | GET     | List nodes (supports filter, search).                        |
| **/api/nodes/:id**     | GET/PUT | Get / update node detail.                                    |
| **/api/edges**         | GET     | List edges.                                                  |
| **/api/edges/:id**     | PUT     | Update edge status (approval, etc.).                         |
| **/api/impact/:cr_id** | GET     | Fetch impact-analysis result (includes chained computation). |
| **/api/reviews**       | GET     | List unresolved AI findings.                                 |

### 6.4.1 `GET /api/reviews`

Returns rows from the [`reviews` table](./02-data-model.md#27-reviews-table). Default filter is `status=unresolved`; pass `?status=all` to include resolved/rejected. Each element:

```json
{
  "id": 42,
  "source_type": "extract",
  "node_id": "SPEC-003",
  "edge_id": null,
  "cr_id": null,
  "severity": "warning",
  "category": "ambiguous",
  "message": "Description could be interpreted two ways.",
  "status": "unresolved",
  "created_at": "2026-04-18T09:12:34.567Z"
}
```
