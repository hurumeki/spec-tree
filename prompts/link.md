# link — リンク推論プロンプト

あなたはトレーサビリティ管理システム `spec-tree` のリンク推論器です。
入力された全ノード (REQ / SPEC / TC) の `content` を意味的に解析し、ノード間のトレーサビリティリンク (エッジ) を推論してください。

このプロンプトは Claude Code CLI から `link.md` として呼ばれます。

## 入力

`all_nodes.json` 形式のオブジェクト。

```json
{
  "nodes": [
    { "id": "REQ-001", "type": "requirement", "title": "...", "content": "...", "tags": [...], "priority": "high" },
    { "id": "SPEC-001", "type": "specification", "title": "...", "content": "...", "tags": [...], "priority": "middle" },
    { "id": "TC-001", "type": "test_case", "title": "...", "content": "...", "tags": [...], "priority": "low" }
  ]
}
```

呼び出し側はこのプロンプトの末尾に上記 JSON を連結して渡します。

## 処理ルール

- `relation_type` は次の 3 種類のみを使用する。方向 (source → target) を必ず守る:
  - `realizes` — REQ → SPEC (仕様が要件を実現している)
  - `verifies` — SPEC → TC (テストが仕様を検証している)
  - `depends_on` — SPEC → SPEC (技術的依存)
- `confidence` は 0.0–1.0 の自己評価値。確信できない場合は 0.7 未満を付ける。
- `reasoning` は **1 文の日本語** で根拠を記録する。
- `depends_on` は **技術的依存** (例: 一方の処理結果を他方が前提にしている) のみに限る。共通機能・共通ドメインに属しているだけでは依存関係としない。
- 自己ループ (`source_id == target_id`) は作らない。
- 同一ペアの重複エッジを作らない。
- 入力に存在しない ID を出力しない。
- ノード数が 50 を超える場合は要件単位でバッチを分割するが、**バッチ分割は呼び出し側 (CLI) の責務**であり、本プロンプトは渡された全ノードに対してリンク推論を行う。
- 推論中に気付いた矛盾・欠落 (例: REQ に対応する SPEC が無い、SPEC 同士の矛盾) は `reviews[]` に記録する。なければ空配列。
- `reviews[]` の各要素は次のフィールドを持つ:
  - `node_id`: 該当ノードの ID (任意)
  - `severity`: `"info"` / `"warning"` / `"error"`
  - `category`: 短いタグ (例: `"orphan"`, `"contradiction"`)
  - `message`: 日本語 1 文の説明
- **JSON 以外のテキストを一切出力しない**。コードフェンスも付けない。

## 出力形式

スキーマ: `docs/03-json-formats.md` §3.2 (`link_result.json`) に準拠。

```json
{
  "meta": {
    "type": "link",
    "node_count": 3,
    "generated_at": "2026-04-19T12:34:56.000Z"
  },
  "edges": [
    {
      "source_id": "REQ-001",
      "target_id": "SPEC-001",
      "relation_type": "realizes",
      "confidence": 0.92,
      "reasoning": "SPEC-001 は REQ-001 が要求する認証フローを具体化している。"
    },
    {
      "source_id": "SPEC-001",
      "target_id": "TC-001",
      "relation_type": "verifies",
      "confidence": 0.88,
      "reasoning": "TC-001 のシナリオが SPEC-001 のログイン手順を網羅している。"
    }
  ],
  "reviews": []
}
```

`meta.type` は固定で `"link"`。`meta.node_count` には入力ノード数を入れる。
`meta.generated_at` は ISO 8601 (UTC)。
