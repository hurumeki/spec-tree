# 2. Data Model

- **Spec version:** 1.0
- **Source chapter:** 2. データモデル
- **Purpose:** Defines the SQLite schema (nodes, edges, version history, change requests, impact) and the design decisions behind it. Load this file first for any persistence-related work.

Data is modeled as a graph of **nodes** (requirements, specifications, test cases) and **edges** (links between them). It is implemented across a handful of SQLite tables; impact scope is computed with recursive CTE graph traversal.

## 2.1 `nodes` table

The three node types (requirement / specification / test case) are unified in a single table. The ID prefix (`REQ-` / `SPEC-` / `TC-`) identifies the type.

| Column | Type | Description |
| :----- | :--- | :---------- |
| **id** | TEXT PK | `REQ-001`, `SPEC-001`, `TC-001` format. |
| **type** | TEXT | `requirement` / `specification` / `test_case`. |
| **current_version** | INTEGER | Current version number. |
| **status** | TEXT | `draft` / `reviewed` / `approved` / `deprecated`. |
| **created_at** | TEXT | Creation timestamp (ISO 8601). |
| **updated_at** | TEXT | Last-update timestamp (ISO 8601). |

## 2.2 `node_versions` table

Holds the full content-change history of each node. Every change creates a new version; all prior versions are preserved.

| Column | Type | Description |
| :----- | :--- | :---------- |
| **id** | INTEGER PK | Auto-increment. |
| **node_id** | TEXT FK | Target node ID. |
| **version** | INTEGER | Version number. |
| **title** | TEXT | Summary of the item (≤ 30 characters). |
| **content** | TEXT | The relevant passage from the source document, preserved verbatim. |
| **tags** | TEXT | JSON array of tags. |
| **priority** | TEXT | 高 / 中 / 低 (high / medium / low). |
| **change_reason** | TEXT | Reason for the change. |
| **created_at** | TEXT | Creation timestamp (ISO 8601). |

## 2.3 `edges` table

Manages traceability links between nodes. Three relation types are defined; each edge carries an AI-assigned confidence value.

| Column | Type | Description |
| :----- | :--- | :---------- |
| **id** | INTEGER PK | Auto-increment. |
| **source_id** | TEXT FK | Source node ID. |
| **target_id** | TEXT FK | Target node ID. |
| **relation_type** | TEXT | `realizes` / `verifies` / `depends_on`. |
| **status** | TEXT | `proposed` / `approved` / `deprecated`. |
| **confidence** | REAL | AI-inference confidence (0.0–1.0). |
| **created_at** | TEXT | Creation timestamp (ISO 8601). |

### 2.3.1 Relation-type definitions

| Type | Direction | Meaning |
| :--- | :-------- | :------ |
| **realizes** | REQ → SPEC | The specification realizes the requirement. |
| **verifies** | SPEC → TC | The test verifies the specification. |
| **depends_on** | SPEC → SPEC | Technical dependency between specifications. |

## 2.4 `edge_history` table

| Column | Type | Description |
| :----- | :--- | :---------- |
| **id** | INTEGER PK | Auto-increment. |
| **edge_id** | INTEGER FK | Target edge ID. |
| **action** | TEXT | `created` / `deleted` / `modified` / `deprecated`. |
| **reason** | TEXT | Reason for the change. |
| **created_at** | TEXT | Creation timestamp (ISO 8601). |

## 2.5 `change_requests` table

| Column | Type | Description |
| :----- | :--- | :---------- |
| **id** | TEXT PK | `CR-001` format. |
| **title** | TEXT | Summary of the change request. |
| **description** | TEXT | Detailed description of the change. |
| **source_document** | TEXT | File name of the originating change document. |
| **status** | TEXT | `analyzing` / `reviewed` / `applied`. |
| **created_at** | TEXT | Creation timestamp (ISO 8601). |

## 2.6 `change_impacts` table

| Column | Type | Description |
| :----- | :--- | :---------- |
| **id** | INTEGER PK | Auto-increment. |
| **change_request_id** | TEXT FK | Change-request ID. |
| **affected_node_id** | TEXT FK | ID of the affected node. |
| **impact_type** | TEXT | `direct` / `transitive`. |
| **depth** | INTEGER | Chain depth of the impact (`0` = direct). |
| **analysis** | TEXT | Analysis text describing the impact. |
| **created_at** | TEXT | Creation timestamp (ISO 8601). |

## 2.7 Design decisions

- **No physical deletion.** All deletes are logical (`status = deprecated`) and full history is retained.
- **ID scheme:** prefix + zero-padded sequence (e.g. `REQ-001`), auto-assigned.
- **Tags** are stored as JSON arrays in TEXT columns and queried with `json_extract()`.
- Expected data volume is roughly 1 MB, well within SQLite's comfortable performance envelope.
