  
**トレーサビリティ管理システム**

システム仕様書

バージョン 1.0

2026年4月18日

# **目次**

# **1\. システム概要**

## **1.1 目的**

本システムは、システム開発における要求仕様・機能仕様・テスト項目の間のトレーサビリティ（追跡可能性）を管理し、仕様変更時の影響範囲を迅速に特定することを目的とする。

生成AI（Claude Code CLI）を活用してドキュメントの構造化・関連付け推論・仕様レビュー・影響範囲分析を行い、人間によるレビュー・承認を経てデータを確定する。

## **1.2 スコープ**

| 項目 | 内容 |
| :---- | :---- |
| **対象ドキュメント** | 要求仕様書、機能仕様書、テスト項目書（Markdown/テキスト形式） |
| **管理階層** | 要求（REQ）→ 仕様（SPEC）→ テストケース（TC）の3階層 |
| **テスト粒度** | E2Eテストレベルまで |
| **利用者** | PM、QA（小規模チーム、10名程度） |
| **実行環境** | ローカル環境（ブラウザ \+ ローカルサーバー） |
| **既存ツール連携** | 不要（スタンドアロン） |

## **1.3 システム構成**

本システムは、CLI側（AI処理エンジン）とWeb UI側（データ管理・視覚化）の2つのコンポーネントで構成される。両者はファイルシステム上のJSONファイルを介してデータを交換する。

### **1.3.1 CLI側（ローカルAIエージェント）**

* Claude Code CLIを使用してAI処理を実行する

* ドキュメントを入力として受け取り、構造化されたJSONを出力する

* プロンプトテンプレートはprompts/ディレクトリに配置する

* 処理結果はoutput/ディレクトリにJSONファイルとして保存する

### **1.3.2 Web UI側（ブラウザ \+ ローカルサーバー）**

* CLI出力のJSONを取り込み、SQLiteに格納する

* グラフ探索による連鎖影響の計算を行う

* トレーサビリティマップ、影響範囲ビューなどの視覚化を提供する

* レビュー・承認のワークフローを管理する

## **1.4 技術スタック**

| レイヤー | 技術 |
| :---- | :---- |
| **AI処理** | Claude Code CLI（ローカル実行） |
| **データストア** | SQLite（ファイルベース、セットアップ不要） |
| **バックエンド** | Node.js（TypeScript）/ REST API |
| **フロントエンド** | React（ブラウザベースUI） |
| **グラフ描画** | D3.js または Cytoscape.js |
| **データ交換** | JSONファイル（ファイルシステム経由） |

# **2\. データモデル**

データはノード（要求・仕様・テスト）とエッジ（関連）のグラフ構造で管理する。SQLiteの2テーブル構成で実装し、再帰CTEによるグラフ探索で影響範囲を計算する。

## **2.1 nodesテーブル**

要求・仕様・テストの3種類を1テーブルに統合して管理する。IDの接頭辞（REQ-/SPEC-/TC-）で種別を識別する。

| カラム | 型 | 説明 |
| :---- | :---- | :---- |
| **id** | TEXT PK | REQ-001, SPEC-001, TC-001 形式 |
| **type** | TEXT | requirement / specification / test\_case |
| **current\_version** | INTEGER | 現在のバージョン番号 |
| **status** | TEXT | draft / reviewed / approved / deprecated |
| **created\_at** | TEXT | 作成日時（ISO 8601） |
| **updated\_at** | TEXT | 更新日時（ISO 8601） |

## **2.2 node\_versionsテーブル**

ノードの内容変更履歴を保持する。変更のたびに新しいバージョンを作成し、過去のすべてのバージョンを保存する。

| カラム | 型 | 説明 |
| :---- | :---- | :---- |
| **id** | INTEGER PK | 自動採番 |
| **node\_id** | TEXT FK | 対象ノードのID |
| **version** | INTEGER | バージョン番号 |
| **title** | TEXT | 項目の要約（30文字以内） |
| **content** | TEXT | 原文の該当箇所 |
| **tags** | TEXT | JSON配列形式のタグ |
| **priority** | TEXT | 高 / 中 / 低 |
| **change\_reason** | TEXT | 変更理由 |
| **created\_at** | TEXT | 作成日時（ISO 8601） |

## **2.3 edgesテーブル**

ノード間のトレーサビリティリンクを管理する。3種類の関連タイプを持ち、AIによる推論信頼度を保持する。

| カラム | 型 | 説明 |
| :---- | :---- | :---- |
| **id** | INTEGER PK | 自動採番 |
| **source\_id** | TEXT FK | 関連元ノードのID |
| **target\_id** | TEXT FK | 関連先ノードのID |
| **relation\_type** | TEXT | realizes / verifies / depends\_on |
| **status** | TEXT | proposed / approved / deprecated |
| **confidence** | REAL | AI推論の信頼度（0.0〜1.0） |
| **created\_at** | TEXT | 作成日時（ISO 8601） |

### **2.3.1 関連タイプの定義**

| タイプ | 方向 | 意味 |
| :---- | :---- | :---- |
| **realizes** | REQ → SPEC | 要求を仕様が実現する |
| **verifies** | SPEC → TC | 仕様をテストが検証する |
| **depends\_on** | SPEC → SPEC | 仕様間の技術的依存関係 |

## **2.4 edge\_historyテーブル**

| カラム | 型 | 説明 |
| :---- | :---- | :---- |
| **id** | INTEGER PK | 自動採番 |
| **edge\_id** | INTEGER FK | 対象エッジのID |
| **action** | TEXT | created / deleted / modified / deprecated |
| **reason** | TEXT | 変更理由 |
| **created\_at** | TEXT | 作成日時（ISO 8601） |

## **2.5 change\_requestsテーブル**

| カラム | 型 | 説明 |
| :---- | :---- | :---- |
| **id** | TEXT PK | CR-001 形式 |
| **title** | TEXT | 変更リクエストの概要 |
| **description** | TEXT | 変更内容の詳細 |
| **source\_document** | TEXT | 元の変更ドキュメントファイル名 |
| **status** | TEXT | analyzing / reviewed / applied |
| **created\_at** | TEXT | 作成日時（ISO 8601） |

## **2.6 change\_impactsテーブル**

| カラム | 型 | 説明 |
| :---- | :---- | :---- |
| **id** | INTEGER PK | 自動採番 |
| **change\_request\_id** | TEXT FK | 変更リクエストのID |
| **affected\_node\_id** | TEXT FK | 影響を受けるノードのID |
| **impact\_type** | TEXT | direct / transitive |
| **depth** | INTEGER | 影響の連鎖の深さ（0=直接） |
| **analysis** | TEXT | 影響の分析内容 |
| **created\_at** | TEXT | 作成日時（ISO 8601） |

## **2.7 設計判断**

* 物理削除は行わない。すべてstatus=deprecatedによる論理削除とし、全履歴を保持する

* ID体系はプレフィックス＋連番（REQ-001）で自動採番する

* tagsはJSON配列としてTEXTカラムに格納し、json\_extract()で検索する

* データ量は1MB程度のため、SQLiteで十分なパフォーマンスを確保できる

# **3\. JSON交換フォーマット**

CLI側とWeb UI側のデータ交換はJSONファイルで行う。4種類のJSONフォーマットを定義する。

## **3.1 構造化抽出結果（extract\_result.json）**

ドキュメントから抽出したノードとAIレビュー指摘を含む。

| フィールド | 説明 |
| :---- | :---- |
| **meta.type** | "extract" 固定 |
| **meta.source\_file** | 入力ドキュメントのファイル名 |
| **meta.doc\_type** | requirement / specification / test\_case |
| **meta.generated\_at** | 生成日時（ISO 8601） |
| **nodes\[\]** | 抽出されたノードの配列 |
| **reviews\[\]** | AIレビュー指摘の配列 |

## **3.2 関連付け結果（link\_result.json）**

ノード間の推論されたエッジを含む。

| フィールド | 説明 |
| :---- | :---- |
| **meta.type** | "link" 固定 |
| **meta.node\_count** | 入力ノード数 |
| **edges\[\]** | 推論されたエッジの配列（confidence、reasoning含む） |

## **3.3 影響分析結果（impact\_result.json）**

仕様変更の影響分析結果を含む。

| フィールド | 説明 |
| :---- | :---- |
| **meta.type** | "impact" 固定 |
| **meta.change\_document** | 変更ドキュメントのファイル名 |
| **change\_summary** | 変更内容の要約 |
| **affected\_nodes\[\]** | 影響を受けるノード（node\_id, impact\_description, required\_action） |
| **suggested\_new\_nodes\[\]** | AI提案の新規ノード |
| **reviews\[\]** | AIレビュー指摘 |

## **3.4 一括バンドル（bundle.json）**

複数の結果を1ファイルにまとめた形式。初期取込時に使用する。

| フィールド | 説明 |
| :---- | :---- |
| **meta.type** | "bundle" 固定 |
| **meta.source\_files\[\]** | 入力ドキュメントのファイル名一覧 |
| **nodes\[\]** | 全ノード |
| **edges\[\]** | 全エッジ |
| **reviews\[\]** | 全レビュー指摘 |

## **3.5 DBエクスポート（db\_snapshot.json）**

Web UIからエクスポートするDB全体のスナップショット。影響分析時にCLIのcontextとして使用する。

| フィールド | 説明 |
| :---- | :---- |
| **meta.type** | "snapshot" 固定 |
| **meta.exported\_at** | エクスポート日時 |
| **nodes\[\]** | 全ノード（最新バージョンの内容含む） |
| **edges\[\]** | 全エッジ（deprecated含む） |

# **4\. AI処理仕様（CLIプロンプト設計）**

AI処理は4つのプロンプトで構成される。すべてClaude Code CLIで実行し、JSON形式で出力する。

## **4.1 プロンプト一覧**

| プロンプト | 目的 | 入力 | 出力 |
| :---- | :---- | :---- | :---- |
| **extract.md** | ドキュメントの構造化・ID採番 | Markdownドキュメント | extract\_result.json |
| **link.md** | ノード間の関連付け推論 | 全ノードJSON | link\_result.json |
| **review.md** | 仕様の漏れ・飛躍の指摘 | ノード+エッジJSON | レビュー指摘JSON |
| **impact.md** | 仕様変更の影響範囲分析 | 変更文書+DBスナップショット | impact\_result.json |

## **4.2 構造化抽出（extract.md）**

ドキュメントから要求・仕様・テスト項目を抽出し、ID採番してノードを生成する。1回のAPI呼び出しで1ドキュメント（1種別）を処理する。

### **4.2.1 処理ルール**

* ドキュメントの見出し構造（\#, \#\#, \#\#\#）を項目の区切りの手がかりにする

* titleは30文字以内で内容を要約する

* contentは原文の該当箇所をそのまま保持する

* tagsはカンマ区切りで関連キーワードを自動分類する

* priorityはセキュリティ・データ損失に関わるものを「高」とする

* JSON以外のテキストは出力しない

## **4.3 関連付け推論（link.md）**

全ノードの内容（content）を意味的に分析し、トレーサビリティリンクを推論する。

### **4.3.1 処理ルール**

* relation\_typeは3種類（realizes/verifies/depends\_on）に限定する

* confidenceはAIの自己評価（0.0〜1.0）を付与する

* reasoningに推論根拠を1文で記載する

* ノード数が50を超える場合は要求単位でバッチ分割する

* depends\_onは技術的な依存のみ。同一機能に属するだけでは依存としない

## **4.4 仕様レビュー（review.md）**

構造化データ全体を分析し、品質上の問題を指摘する。

### **4.4.1 指摘の種類**

| 種類 | 説明 |
| :---- | :---- |
| **missing\_coverage** | 仕様に対応するテストケースがない |
| **missing\_spec** | 要求に対応する仕様がない |
| **spec\_gap** | 仕様に飛躍や前提条件の欠落がある |
| **inconsistency** | 仕様間またはテスト間の矛盾 |

## **4.5 影響範囲分析（impact.md）**

仕様変更ドキュメントから直接影響を受けるノードを特定する。連鎖影響（transitive）の計算はWeb UI側のグラフ探索で行う。

### **4.5.1 AIとプログラムの役割分担**

| 担当 | 処理内容 |
| :---- | :---- |
| **AI（CLI）** | 変更内容の理解、意味的に直接影響するノードの特定、新規ノードの提案 |
| **プログラム（UI）** | depends\_on/verifies エッジを辿る連鎖影響の計算（再帰CTE） |

# **5\. CLIワークフロー**

## **5.1 初期取込フロー**

1. 要求仕様書をextract.mdで構造化 → extract\_req.json

2. 機能仕様書をextract.mdで構造化 → extract\_spec.json

3. テスト項目書をextract.mdで構造化 → extract\_tc.json

4. 全ノードをjqでマージ → all\_nodes.json

5. link.mdで関連付け推論 → link\_result.json

6. review.mdで品質レビュー → review\_result.json

7. jqでbundle.jsonに統合

8. Web UIでbundle.jsonを取込・レビュー・承認

## **5.2 仕様変更フロー**

9. Web UIから GET /api/export でDBスナップショットをエクスポート

10. impact.mdに変更文書とスナップショットを入力 → impact\_result.json

11. Web UIでimpact\_result.jsonを取込

12. Web UI側でグラフ探索（再帰CTE）を実行し、連鎖影響を追加

13. 影響範囲ビューでレビュー・承認

## **5.3 ディレクトリ構成**

project/

  prompts/           \# プロンプトテンプレート

    extract.md

    link.md

    review.md

    impact.md

  docs/              \# 入力ドキュメント

    requirements.md

    specifications.md

    test\_cases.md

  output/            \# CLI出力（JSON）

  web/               \# Web UIアプリケーション

  data/              \# SQLiteデータベース

    trace.db

## **5.4 自動化**

Makefile または npm scripts で初期取込パイプラインを一発実行する構成が可能。

make init DOCS=./docs/   \# ステップ1-7を一括実行

make import              \# bundle.jsonをUIに自動取込

make impact DOC=change.md  \# 影響分析を実行

# **6\. Web UI仕様**

## **6.1 画面一覧**

| 画面 | 主な利用者 | 機能 |
| :---- | :---- | :---- |
| **トレーサビリティマップ** | PM, QA | 要求→仕様→テストのツリー表示、検索、フィルタ、AI指摘のハイライト |
| **ノード詳細** | PM, QA | ノードの全情報表示、関連ノード一覧、変更履歴タイムライン |
| **影響範囲ビュー** | PM | 仕様変更の影響分析結果、直接/連鎖影響の色分け、新規ノードの採用/却下 |
| **JSONインポート** | PM, QA | CLI出力JSONの取込、検証、差分プレビュー、承認 |

## **6.2 JSONインポート画面**

CLI出力のJSONをWeb UIに取り込む中核機能。4ステップのウィザード形式で設計する。

### **6.2.1 ステップ1: ファイル選択**

* ドラッグ＆ドロップ、ファイル選択ダイアログ、CLIディレクトリ指定の3方式に対応

* ファイル監視モード: \--watch オプションで output/ を監視し、新規JSON検知時に自動で検証画面を表示

### **6.2.2 ステップ2: 検証**

* JSONフォーマットの正当性チェック

* meta.type による種別判定（extract / link / impact / bundle）

* 必須フィールドの存在確認

* ID形式の準拠チェック（REQ/SPEC/TC-NNN）

* 既存DBとのID重複検出（上書き確認）

### **6.2.3 ステップ3: 差分プレビュー**

* 追加・更新・削除されるデータの一覧表示（色分け）

* AI指摘の表示

* 個別ノードの編集機能

### **6.2.4 ステップ4: 取込実行**

* SQLiteへのデータ格納

* バージョン管理（既存ノードの更新時は新バージョンを作成）

* エッジのstatus=proposed での仮登録

## **6.3 影響範囲ビュー**

仕様変更の影響分析結果を表示する画面。直接影響（赤）と連鎖影響（オレンジ）を色分けし、depthで影響の遠さを表現する。

* 直接影響（depth=0）: AIが特定した直接影響ノード。赤色で表示

* 連鎖影響（depth=1以上）: グラフ探索で辿った間接影響。オレンジ色で表示。depthが大きいほど薄く

* 新規追加候補: AI提案の新規ノード。緑の破線で表示。「採用」「却下」ボタン付き

* AI指摘: 影響分析時に検出された追加の品質問題

## **6.4 REST API**

| エンドポイント | メソッド | 機能 |
| :---- | :---- | :---- |
| **/api/import** | POST | JSONファイルの取込（検証 \+ 格納） |
| **/api/export** | GET | DBスナップショットのエクスポート |
| **/api/nodes** | GET | ノード一覧（フィルタ、検索対応） |
| **/api/nodes/:id** | GET/PUT | ノード詳細の取得・更新 |
| **/api/edges** | GET | エッジ一覧 |
| **/api/edges/:id** | PUT | エッジのstatus更新（承認等） |
| **/api/impact/:cr\_id** | GET | 影響分析結果の取得（連鎖計算含む） |
| **/api/reviews** | GET | 未対応のAI指摘一覧 |

# **7\. 影響範囲計算ロジック**

## **7.1 処理フロー**

14. AIが直接影響ノードを特定（impact\_result.jsonのaffected\_nodes）

15. 直接影響ノードをchange\_impactsテーブルにimpact\_type=directで格納

16. 各直接影響ノードから再帰CTEでdepends\_on/verifiesエッジを辿る

17. 辿ったノードをimpact\_type=transitiveで格納（depthを記録）

18. 最大探索深度は5（設定可能）

## **7.2 再帰CTEクエリ**

WITH RECURSIVE impact(node\_id, depth, path) AS (

  SELECT 'SPEC-003', 0, 'SPEC-003'

  UNION ALL

  SELECT e.target\_id, i.depth \+ 1,

    i.path || ' \-\> ' || e.target\_id

  FROM impact i

  JOIN edges e ON e.source\_id \= i.node\_id

  WHERE i.depth \< 5 AND e.status \= 'approved'

)

SELECT \* FROM impact;

## **7.3 視覚化での表現**

| depth | 色 | 表現 |
| :---- | :---- | :---- |
| **0（直接影響）** | 赤（\#E24B4A） | 太枠、濃い背景 |
| **1** | オレンジ（\#EF9F27） | 通常枠、やや濃い背景 |
| **2以上** | 薄いオレンジ（\#FAEEDA） | 細枠、薄い背景 |
| **新規追加** | 緑（\#639922） | 破線枠 |

# **8\. 運用ルール**

## **8.1 ステータス管理**

| ステータス | 説明 | 遷移条件 |
| :---- | :---- | :---- |
| **draft** | AI生成直後、未レビュー | インポート時に自動設定 |
| **reviewed** | レビュー済み、未承認 | レビュアーが確認後に変更 |
| **approved** | 承認済み、確定 | 承認者が確定操作を実行 |
| **deprecated** | 廃止（論理削除） | 要求削除・仕様廃止時に変更 |

## **8.2 バージョン管理ルール**

* ノードの内容が変更されるたびにバージョンを1つインクリメントする

* 過去のバージョンはすべて保持し、物理削除しない

* change\_reasonに変更理由を必ず記録する

* 差分表示はバージョンN-1とNのcontent比較で行う

## **8.3 レビュー運用**

* AI出力は必ず人間がレビューしてからapprovedに変更する

* confidence 0.7未満のエッジはUIで黄色ハイライトし、優先レビュー対象とする

* AI指摘（reviews）はレビュー画面で「対応済み」「却下」のいずれかを選択する

* 影響分析結果のsuggested\_new\_nodesは「採用」「却下」を人間が判断する

## **8.4 バッチ分割基準**

* ノード数が50を超える場合、関連付け推論（link.md）はバッチ分割する

* 要求単位でグループ分けし、複数回CLIを実行して結果をマージする

* 1MBのドキュメントで想定されるノード数は50〜200程度

# **9\. 非機能要件**

## **9.1 パフォーマンス**

* SQLiteでのグラフ探索（再帰CTE）: 1MB規模のデータで数ミリ秒以内

* JSONインポート: 100ノード規模で1秒以内

* UI応答: ページ表示は500ms以内

## **9.2 データ保全**

* SQLiteファイル（trace.db）の定期バックアップを推奨

* 物理削除を行わない設計により、誤操作からの復元が可能

* JSONインポート前に既存DBのスナップショットを自動保存する

## **9.3 拡張性**

* データ量が大幅に増加した場合、Neo4j等のグラフDBへの移行パスを確保

* 新しいノードタイプ（例: 実装コード）の追加はtypeカラムの値追加のみで対応可能

* 新しい関連タイプの追加はrelation\_typeカラムの値追加のみで対応可能

## **9.4 制約事項**

* ローカル環境での単一ユーザー利用を前提とする（同時編集は非対応）

* AI処理の精度はプロンプトの品質に依存するため、運用しながらプロンプトを改善する

* Claude Code CLIの利用にはAnthropicのAPIキーが必要