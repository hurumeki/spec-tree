# 5. CLI Workflow

- **Spec version:** 1.0
- **Source chapter:** 5. CLIワークフロー
- **Purpose:** Describes the two end-to-end CLI pipelines (initial import, change analysis), the repository layout, and automation entry points.

## 5.1 Initial-import flow

1. Structure the requirement document with `extract.md` → `extract_req.json`.
2. Structure the functional-specification document with `extract.md` → `extract_spec.json`.
3. Structure the test-case document with `extract.md` → `extract_tc.json`.
4. Merge all nodes with `jq` → `all_nodes.json`.
5. Infer links with `link.md` → `link_result.json`.
6. Run a quality review with `review.md` → `review_result.json`.
7. Integrate everything into `bundle.json` with `jq`.
8. Ingest / review / approve `bundle.json` in the Web UI.

## 5.2 Specification-change flow

1. From the Web UI, `GET /api/export` to export a DB snapshot.
2. Feed the change document and the snapshot into `impact.md` → `impact_result.json`.
3. Ingest `impact_result.json` in the Web UI.
4. On the Web UI, run graph traversal (recursive CTE) to add chained impact.
5. Review and approve on the Impact-scope screen.

## 5.3 Directory layout

The repository uses an npm-workspaces monorepo. The root-level folders `prompts/`, `input/`, `output/`, and `data/` are working directories read/written by the CLI. The actual application workspaces live under `packages/`.

```
project/
  package.json       # Root (workspaces definition, cross-cutting scripts)
  tsconfig.base.json # Shared TypeScript config
  prompts/           # Prompt templates
    extract.md
    link.md
    review.md
    impact.md
  input/             # Input documents (formerly docs/)
    requirements.md
    specifications.md
    test_cases.md
  output/            # CLI output (JSON)
  data/              # SQLite database
    trace.db
  packages/
    backend/         # Node.js (TypeScript) REST API server
      src/
      package.json
      tsconfig.json
    web/             # React + Vite frontend
      src/
      index.html
      vite.config.ts
      package.json
      tsconfig.json
```

## 5.4 Automation

A Makefile or npm scripts can drive the initial-import pipeline as a single command:

```
make init DOCS=./input/    # run steps 1–7 in one shot
make import                # auto-ingest bundle.json into the UI
make impact DOC=change.md  # run impact analysis
```
