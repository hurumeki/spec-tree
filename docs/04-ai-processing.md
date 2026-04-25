# 4. AI Processing (CLI Prompt Design)

- **Spec version:** 1.0
- **Source chapter:** 4. AI処理仕様
- **Purpose:** Defines the four CLI prompts that drive AI processing and the rules each must follow. Outputs are the JSON shapes from [JSON Formats](./03-json-formats.md).

All AI processing is performed through `@spec-tree/ai` (`packages/ai/`), which routes the rendered prompt to the configured provider and produces JSON output. The default provider is the Claude Code CLI; the Anthropic API, OpenAI API, and Ollama are interchangeable alternatives. Provider selection is read from `AI_PROVIDER` (env), `ai.config.json`, or a `--provider` CLI flag — see [`packages/ai/`](../packages/ai/) for the interface.

## 4.1 Prompt catalog

| Prompt         | Goal                                           | Input                         | Output                |
| :------------- | :--------------------------------------------- | :---------------------------- | :-------------------- |
| **extract.md** | Structure a document and assign IDs.           | Markdown document             | `extract_result.json` |
| **link.md**    | Infer links between nodes.                     | All-nodes JSON                | `link_result.json`    |
| **review.md**  | Point out gaps and leaps in the specification. | Nodes + edges JSON            | Review-findings JSON  |
| **impact.md**  | Analyze the impact of a specification change.  | Change document + DB snapshot | `impact_result.json`  |

## 4.2 Structured extraction — `extract.md`

Extracts requirements / specifications / test cases from a document, assigns IDs, and produces nodes. One API call processes one document (one node type).

### 4.2.1 Processing rules

- Use the document's heading structure (`#`, `##`, `###`) as cues for item boundaries.
- `title` must summarize the item in ≤ 30 characters.
- `content` must preserve the corresponding passage from the source verbatim.
- `tags` are auto-classified as comma-separated related keywords.
- `priority` is set to **`high`** for items involving security or data loss.
- Emit no text outside of JSON.

## 4.3 Link inference — `link.md`

Analyzes the `content` of every node semantically and infers traceability links.

### 4.3.1 Processing rules

- `relation_type` is limited to the three values: `realizes` / `verifies` / `depends_on`.
- `confidence` is the AI's self-evaluation (0.0–1.0).
- `reasoning` records the rationale in a single sentence.
- If node count exceeds 50, split into batches by requirement unit.
- `depends_on` is for **technical** dependencies only; mere shared-feature membership is not a dependency.

## 4.4 Specification review — `review.md`

Analyzes the structured data as a whole and raises quality issues.

### 4.4.1 Types of findings

| Type                 | Description                                                 |
| :------------------- | :---------------------------------------------------------- |
| **missing_coverage** | A specification has no corresponding test case.             |
| **missing_spec**     | A requirement has no corresponding specification.           |
| **spec_gap**         | A specification has a logical leap or missing precondition. |
| **inconsistency**    | Contradiction between specifications or between tests.      |

## 4.5 Impact analysis — `impact.md`

From a specification-change document, identifies the nodes directly affected. Transitive (chained) impact is computed by the Web UI via graph traversal — not by the AI.

### 4.5.1 Division of labor: AI vs. program

| Handled by       | What it does                                                                              |
| :--------------- | :---------------------------------------------------------------------------------------- |
| **AI (CLI)**     | Understand the change; identify semantically, directly affected nodes; propose new nodes. |
| **Program (UI)** | Compute chained impact by traversing `depends_on` / `verifies` edges (recursive CTE).     |
