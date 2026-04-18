# 1. System Overview

- **Spec version:** 1.0
- **Source chapter:** 1. システム概要
- **Purpose:** Describes what this system does, who uses it, and how its two halves (CLI and Web UI) fit together.

## 1.1 Purpose

The system manages traceability between requirement specifications, functional specifications, and test cases in system development, and enables rapid identification of the impact scope when a specification changes.

It uses generative AI (Claude Code CLI) to structure documents, infer links, review specifications, and analyze change impact. A human reviewer/approver then validates and confirms the data.

## 1.2 Scope

| Item                          | Content                                                                                           |
| :---------------------------- | :------------------------------------------------------------------------------------------------ |
| **Target documents**          | Requirement specification, functional specification, test-case document (Markdown / text format). |
| **Management hierarchy**      | Requirement (REQ) → Specification (SPEC) → Test Case (TC), three tiers.                           |
| **Test granularity**          | Up to E2E test level.                                                                             |
| **Users**                     | PM, QA (small team, ~10 people).                                                                  |
| **Runtime environment**       | Local (browser + local server).                                                                   |
| **External tool integration** | Not required (standalone).                                                                        |

## 1.3 System architecture

The system has two components: a **CLI side** (AI processing engine) and a **Web UI side** (data management and visualization). They exchange data through JSON files on the local filesystem.

### 1.3.1 CLI side (local AI agent)

- Runs AI processing via the Claude Code CLI.
- Takes documents as input and emits structured JSON output.
- Prompt templates live under `prompts/`.
- Processing results are written as JSON files under `output/`.

### 1.3.2 Web UI side (browser + local server)

- Ingests CLI JSON output and stores it in SQLite.
- Performs graph traversal to compute transitive (chained) impact.
- Visualizes the traceability map, impact view, etc.
- Manages the review/approval workflow.

## 1.4 Tech stack

| Layer                             | Technology                                     |
| :-------------------------------- | :--------------------------------------------- |
| **AI processing**                 | Claude Code CLI (local execution).             |
| **Data store**                    | SQLite (file-based, no setup).                 |
| **Backend**                       | Node.js (TypeScript) / REST API.               |
| **Frontend**                      | React + Vite + TypeScript (browser-based SPA). |
| **Graph rendering**               | Cytoscape.js.                                  |
| **Data exchange**                 | JSON files (through the filesystem).           |
| **Package management / monorepo** | npm workspaces.                                |
| **Testing**                       | Vitest.                                        |
| **Code quality**                  | ESLint + Prettier.                             |
