# Traceability Management System — Specification

- **Version:** 1.0
- **Original source:** `traceability_system_spec_v1.md` (Japanese, 2026-04-18), relocated and translated into English.
- **Purpose of this folder:** authoritative system specification, split by chapter so an AI agent can load only the sections it needs.

## About the system (one paragraph)

`spec-tree` manages traceability between requirements (REQ), specifications (SPEC), and test cases (TC) in system development, and identifies the impact scope of specification changes. It uses the Claude Code CLI as an AI engine to structure documents, infer links, review specifications, and analyze change impact; a Web UI (React + Vite over a Node.js REST API backed by SQLite) lets human reviewers validate and approve the AI output.

## Table of contents

| # | File | What it covers |
| :- | :--- | :--- |
| 1 | [01-system-overview.md](./01-system-overview.md) | Purpose, scope, high-level architecture, tech stack. |
| 2 | [02-data-model.md](./02-data-model.md) | SQLite schema: `nodes`, `node_versions`, `edges`, `edge_history`, `change_requests`, `change_impacts`, design decisions. |
| 3 | [03-json-formats.md](./03-json-formats.md) | CLI ↔ UI exchange formats: `extract_result`, `link_result`, `impact_result`, `bundle`, `db_snapshot`. |
| 4 | [04-ai-processing.md](./04-ai-processing.md) | The four CLI prompts (`extract`, `link`, `review`, `impact`) and their rules. |
| 5 | [05-cli-workflow.md](./05-cli-workflow.md) | Initial-import pipeline, change-analysis pipeline, directory layout, automation. |
| 6 | [06-web-ui.md](./06-web-ui.md) | Screens, JSON-import wizard, impact view, REST API. |
| 7 | [07-impact-analysis.md](./07-impact-analysis.md) | Direct vs. transitive impact, recursive CTE, visual encoding. |
| 8 | [08-operations.md](./08-operations.md) | Status lifecycle, versioning rules, review operations, batching. |
| 9 | [09-non-functional.md](./09-non-functional.md) | Performance, data safety, extensibility, constraints. |

## How to navigate as an AI agent

- Start here for orientation, then load **only** the chapter(s) relevant to the task.
- If you're implementing anything that touches persistence, load `02-data-model.md` first — it is referenced by chapters 3, 4, 5, 6, and 7.
- CLI work: `04-ai-processing.md` + `05-cli-workflow.md`.
- Web UI / backend work: `06-web-ui.md` + `07-impact-analysis.md` + `02-data-model.md`.
- Each chapter keeps the original numbering (e.g. `## 2.3 edges table` inside `02-data-model.md`), so cross-references from other chapters resolve by section anchor.

## ID prefix glossary

| Prefix | Meaning |
| :----- | :------ |
| `REQ-` | Requirement node |
| `SPEC-` | Specification node |
| `TC-` | Test-case node |
| `CR-` | Change request |
