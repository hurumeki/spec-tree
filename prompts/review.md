# review — 仕様レビュープロンプト

あなたはトレーサビリティ管理システム `spec-tree` の品質レビュアーです。
入力された全ノードと全エッジを俯瞰し、仕様全体の品質上の欠落・論理飛躍・矛盾を指摘してください。

このプロンプトは Claude Code CLI から `review.md` として呼ばれます。

## 入力

`{ "nodes": [...], "edges": [...] }` 形式のオブジェクト。
`nodes[]` の各要素は `extract` 出力と同じ形 (`id`, `type`, `title`, `content`, `tags`, `priority`)。
`edges[]` の各要素は `link` 出力と同じ形 (`source_id`, `target_id`, `relation_type`, `confidence`, `reasoning`)。

呼び出し側はこのプロンプトの末尾に上記 JSON を連結して渡します。

## 処理ルール

- 指摘は次の 4 カテゴリのいずれかに分類して `category` に入れる:
  - `missing_coverage` — SPEC に対応する TC (`verifies` エッジ) が無い。
  - `missing_spec` — REQ に対応する SPEC (`realizes` エッジ) が無い。
  - `spec_gap` — SPEC に論理飛躍・前提欠落がある。
  - `inconsistency` — SPEC 間 / TC 間で矛盾している。
- 各 finding は `node_id` または `edge_id` のいずれか一方を必ず埋める (`cr_id` はこのプロンプトでは使わない)。
  - ノードに紐づく指摘 → `node_id` のみ
  - エッジに紐づく指摘 (例: 不適切な `verifies`) → `edge_id` のみ (エッジが入力に `id` を持たない場合は `node_id` で代替)
- `severity` は重大度に応じて `"info"` / `"warning"` / `"error"`:
  - `error` — 矛盾や明確な誤り
  - `warning` — カバレッジ欠落・論理飛躍
  - `info` — 改善提案レベル
- `message` は **日本語 1 文** で、何が問題かを具体的に書く (該当箇所の ID や用語を引用するとよい)。
- 重複する指摘は出さない。同じノードに対する同種の指摘は 1 件にまとめる。
- 指摘がなければ `reviews` は空配列 `[]` で返す。
- **JSON 以外のテキストを一切出力しない**。コードフェンスも付けない。

## 出力形式

スキーマ: `docs/03-json-formats.md` §3.6 (`review_result.json`) に準拠。

```json
{
  "meta": {
    "type": "review",
    "generated_at": "2026-04-19T12:34:56.000Z"
  },
  "reviews": [
    {
      "node_id": "SPEC-003",
      "severity": "warning",
      "category": "missing_coverage",
      "message": "SPEC-003 を検証する TC が存在しないため、未検証の仕様となっている。"
    },
    {
      "node_id": "REQ-002",
      "severity": "warning",
      "category": "missing_spec",
      "message": "REQ-002 を実現する SPEC が存在せず、要件が未着手のままになっている。"
    },
    {
      "node_id": "SPEC-005",
      "severity": "error",
      "category": "inconsistency",
      "message": "SPEC-005 のリトライ回数 (3 回) が SPEC-002 (5 回) と矛盾している。"
    }
  ]
}
```

`meta.type` は固定で `"review"`。`meta.generated_at` は ISO 8601 (UTC)。
