# spec-tree

トレーサビリティ管理システム（Traceability Management System）。仕様書は [`traceability_system_spec_v1.md`](./traceability_system_spec_v1.md) を参照。

## 構成

npm workspaces によるモノレポ。

```
spec-tree/
├── packages/
│   ├── backend/   # Node.js + TypeScript の REST API サーバ
│   └── web/       # React + Vite のフロントエンド SPA
├── prompts/       # CLI プロンプトテンプレ (extract/link/review/impact)
├── docs/          # 入力ドキュメント (要求・仕様・テスト)
├── output/        # CLI 出力 JSON
└── data/          # SQLite データベース (trace.db)
```

## 必要環境

- Node.js 22 以上（`.nvmrc` 参照）
- npm 10 以上

## セットアップ

```bash
npm install
```

## よく使うコマンド（ルート実行）

| コマンド               | 内容                                       |
| :--------------------- | :----------------------------------------- |
| `npm run dev`          | Web ワークスペースの Vite 開発サーバを起動 |
| `npm run build`        | 全ワークスペースのビルド                   |
| `npm run test`         | 全ワークスペースの Vitest 実行             |
| `npm run typecheck`    | 全ワークスペースの型チェック               |
| `npm run lint`         | ESLint をリポジトリ全体に適用              |
| `npm run format`       | Prettier で整形                            |
| `npm run format:check` | 整形差分の確認のみ                         |

ワークスペース個別に実行する場合は `-w packages/<name>` または `--workspace packages/<name>` を付ける。

## スコープ

本ブランチは開発環境セットアップのみ。実装（SQLite スキーマ、REST API、画面、CLI プロンプト）は後続ブランチで段階的に追加する。
