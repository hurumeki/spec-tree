# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

`spec-tree` is a **traceability management system**: it tracks the links between requirements (REQ), functional specifications (SPEC), and test cases (TC), and computes the impact scope of specification changes. The system has two halves — a CLI side that runs a pluggable AI provider (default: Claude Code CLI; also Anthropic API, OpenAI API, and Ollama via `@spec-tree/ai`) to structure documents, infer links, review specs, and analyze change impact, and a Web UI side (React + Vite SPA over a Node.js REST API, backed by SQLite) where humans review and approve the AI output. The two sides exchange JSON files through the local filesystem.

## Where the spec lives

The authoritative system specification is in [`docs/`](./docs/README.md), split one file per chapter so you can load only the section you need. **Start with [`docs/README.md`](./docs/README.md)** for the table of contents and a reading guide.

Quick pointers by task:

- Persistence / schema work → [`docs/02-data-model.md`](./docs/02-data-model.md).
- CLI / prompt work → [`docs/04-ai-processing.md`](./docs/04-ai-processing.md) + [`docs/05-cli-workflow.md`](./docs/05-cli-workflow.md).
- Web UI / backend work → [`docs/06-web-ui.md`](./docs/06-web-ui.md) + [`docs/07-impact-analysis.md`](./docs/07-impact-analysis.md) + [`docs/02-data-model.md`](./docs/02-data-model.md).
- JSON interchange → [`docs/03-json-formats.md`](./docs/03-json-formats.md).

Do not treat the source Japanese spec as primary — the English files under `docs/` are the canonical reference going forward.

## Repository layout

```
spec-tree/
├── CLAUDE.md           # This file
├── README.md           # User-facing README (Japanese)
├── docs/               # System specification (English, split by chapter)
├── input/              # User-supplied input documents: requirements / specs / test cases
├── prompts/            # CLI prompt templates: extract / link / review / impact
├── output/             # CLI JSON output
├── data/               # SQLite database (trace.db)
└── packages/
    ├── ai/             # Provider-agnostic AI runner (claude-code / anthropic / openai / ollama)
    ├── backend/        # Node.js + TypeScript REST API
    └── web/            # React + Vite SPA
```

**Naming note:** `input/` holds the user's source documents that the CLI ingests; `docs/` holds the system specification. Do not confuse them.

## Tech stack & conventions

- npm workspaces monorepo; Node.js ≥ 22 (see `.nvmrc`).
- TypeScript across both packages; shared config in `tsconfig.base.json`.
- Lint with ESLint, format with Prettier; test with Vitest.
- Graph rendering in the UI uses Cytoscape.js.

## Common commands (run from repo root)

| Command                | What it does                                |
| :--------------------- | :------------------------------------------ |
| `npm install`          | Install dependencies across all workspaces. |
| `npm run dev`          | Start the web workspace's Vite dev server.  |
| `npm run build`        | Build all workspaces.                       |
| `npm run test`         | Run Vitest across all workspaces.           |
| `npm run typecheck`    | Type-check all workspaces.                  |
| `npm run lint`         | Run ESLint over the whole repository.       |
| `npm run format`       | Apply Prettier formatting.                  |
| `npm run format:check` | Verify formatting without writing.          |

Scope a command to a single workspace with `-w packages/<name>` or `--workspace packages/<name>`.

## Branching

Feature work lands on dedicated branches (current branch for this change: `claude/rename-docs-restructure-oY8SO`). Do not push directly to `main`.

## Scope of this branch snapshot

Only the monorepo scaffolding is in place. The SQLite schema, REST API, UI screens, and CLI prompt templates described in the spec are **not yet implemented** — they are being added on successor branches.

## Response style (token budget)

Optimize for low token consumption.

- Answer in as few words as possible; skip preambles, restatements, and closing summaries.
- No emojis. No headings or bullet lists unless the answer genuinely needs structure.
- Do not echo file contents, diffs, or command output the user can already see.
- Quote only the minimal code span needed; refer to code by `path:line` instead of pasting.
- When loading docs, read only the relevant chapter under `docs/` (see the task pointers above), not the whole folder.
- Prefer `Grep` / `Glob` with narrow patterns over `Read` on large files; use `offset`/`limit` when reading.
- Delegate wide, multi-step searches to the `Explore` subagent so its intermediate output stays out of the main context.
- Plan silently; surface only decisions and results, not the reasoning trace.
