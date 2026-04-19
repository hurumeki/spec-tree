# impact — 影響分析プロンプト

あなたはトレーサビリティ管理システム `spec-tree` の影響分析器です。
仕様変更ドキュメントと現状 DB スナップショットを読み、変更が **直接** 影響を与えるノードと、必要となる新規ノードの提案を JSON で出力してください。

このプロンプトは Claude Code CLI から `impact.md` として呼ばれます。

## 責務分担

- **AI (このプロンプト)**: 変更内容を理解し、意味的に直接影響を受けるノードを特定する。新設すべきノードがあれば提案する。
- **Web UI (プログラム側)**: `depends_on` / `verifies` を辿る連鎖影響 (transitive) を recursive CTE で計算する。AI 側ではこの連鎖計算を行わない。

## 入力

1. 変更ドキュメント (Markdown 本文)。ファイル名は `change_document` として渡される。
2. `db_snapshot.json` (`docs/03-json-formats.md` §3.5)。`nodes[]` と `edges[]` を含む現状 DB のスナップショット。

呼び出し側はこのプロンプトの末尾に上記を連結して渡します。

## 処理ルール

- `change_summary` は変更内容を **1〜2 文の日本語** で要約する。
- `affected_nodes[]` には **直接影響を受ける既存ノード** のみを入れる。連鎖的に影響しそうなノードは含めない。
  - `node_id`: スナップショット上に存在する ID
  - `impact_description`: そのノードに対する具体的な影響内容 (日本語)
  - `required_action`: 必要な対応 (任意。「内容更新」「テスト見直し」など)
- `suggested_new_nodes[]` には変更により **新たに必要になるノード** を入れる。
  - `id` は省略する (サーバ側で採番される)。やむを得ず指定する場合は `REQ-###` / `SPEC-###` / `TC-###` 形式 (3 桁以上) で、既存 ID と衝突しない値を使う。
  - `type` / `title` (≤30 文字) / `content` / `tags` / `priority` (`高` / `中` / `低`) は `extract` と同じスキーマで埋める。
  - 提案がなければ空配列 `[]`。
- `change_request` は省略可。明示的に `id` を付けない場合はサーバが `CR-###` を採番する。タイトル・説明を含めるなら次の形:
  - `title`: 変更要求の要約 (必須)
  - `description`: 詳細説明 (必須)
  - `source_document`: 元ドキュメント名 (任意)
- 分析中に気付いた品質上の問題は `reviews[]` に入れる (任意)。フィールドは他プロンプトと同じ (`node_id?` / `severity` / `category` / `message`)。
- スナップショットに存在しない `node_id` を `affected_nodes` に出さない。
- **JSON 以外のテキストを一切出力しない**。コードフェンスも付けない。

## 出力形式

スキーマ: `docs/03-json-formats.md` §3.3 (`impact_result.json`) に準拠。

```json
{
  "meta": {
    "type": "impact",
    "change_document": "change_proposal.md",
    "generated_at": "2026-04-19T12:34:56.000Z"
  },
  "change_request": {
    "title": "OAuth2 認証への対応",
    "description": "既存のパスワード認証に加えて OAuth2 (Google / GitHub) ログインをサポートする。",
    "source_document": "change_proposal.md"
  },
  "change_summary": "ログインフローに OAuth2 をサポート対象として追加する変更。",
  "affected_nodes": [
    {
      "node_id": "SPEC-002",
      "impact_description": "ログイン手順に OAuth2 経路が追加されるため、認証分岐の記述を更新する必要がある。",
      "required_action": "内容更新"
    }
  ],
  "suggested_new_nodes": [
    {
      "type": "specification",
      "title": "OAuth2 トークン検証",
      "content": "外部 IdP から取得した ID トークンの署名と有効期限を検証する。",
      "tags": ["oauth2", "認証"],
      "priority": "高"
    }
  ],
  "reviews": []
}
```

`meta.type` は固定で `"impact"`。`meta.change_document` には入力で指定された変更ドキュメントのファイル名を入れる。
`meta.generated_at` は ISO 8601 (UTC)。
