# learning-knowledge-app

学習メモを「小粒に残して強力に検索」できる個人向けナレッジアプリ。

## 技術スタック
- Frontend: React + TypeScript（Vite）
- Backend: FastAPI（Python）
- DB: PostgreSQL
- Infra(Local): Docker Compose

## 開発起動
1) 環境変数を作成

```bash
copy .env.example .env
```

2) 起動

```bash
docker compose up -d --build
```

3) アクセス
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`（Swagger: `/docs`）

## UI（Notion寄り）
- **3ペイン**: サイドバー / 一覧 / 本文
- **Focus（本文最大化）**: サイドバーと一覧を隠して本文を全幅表示（`Esc`で解除可能）
- **目次**: Markdown見出し（`#..####`）から自動生成し、スクロール位置をハイライト
- **編集**: `/notes/:id/edit` の専用画面（2カラム: editor / preview）

## 自動登録（Claude等の外部ツール向け）

画面操作ができない環境からでも、REST APIでノートを自動登録できます。

### 1) APIキーを設定

`.env` に `AUTOMATION_API_KEY` を設定して起動してください。
また、ノートを保存する対象ユーザを固定したい場合は `AUTOMATION_USER_EMAIL` を設定します。

例:

```bash
AUTOMATION_API_KEY=change-this-to-a-long-random-string
AUTOMATION_USER_EMAIL=you@example.com
```

### 2) ノートのUpsert（topic/tagを名前で指定）

- **endpoint**: `POST /api/automation/notes:upsert`
- **auth header**: `X-Automation-Key: <AUTOMATION_API_KEY>`
- **optional header**: `X-Automation-User: <email>`（リクエスト単位で対象ユーザを上書き）
- **特徴**
  - `topic_name` / `tag_names` を **名前で指定**（存在しなければ自動作成）
  - `external_id` を指定すると **同じexternal_idは更新**（冪等）

payload例:

```json
{
  "external_id": "claude:project-x:term:vector-db",
  "title": "Vector DB: 基本用語",
  "markdown_content": "## 用語\n- embedding\n- ANN\n",
  "summary": "Vector DBの基礎用語メモ",
  "topic_name": "Backend",
  "tag_names": ["claude", "rag", "tips"],
  "source": "claude",
  "is_starred": false
}
```

※詳細は Swagger の `http://localhost:8000/docs` を参照してください。

## 軽量一覧API（重複チェック/自動化向け）
ノートが増えたときに、本文まで含む一覧取得は重くなりやすいので、本文なしの軽量一覧も用意しています。

- **endpoint**: `GET /api/notes/items`
- **auth header**: `Authorization: Bearer <access_token>`
- **レスポンス**: `id,title,summary,is_starred,topic_id,tag_ids,created_at,updated_at`（`markdown_content` なし）

### Automation（Claude等）からの事前照会
automationキーは「書き込み専用」を維持しつつ、事前の重複チェック用途のために **automationスコープの読み取り**を別エンドポイントで提供します。

- **endpoint**: `GET /api/automation/notes:list`
- **auth header**: `X-Automation-Key: <AUTOMATION_API_KEY>`
- **optional header**: `X-Automation-User: <email>`
- **レスポンス**: 上記と同等 + `external_id`, `source`（`markdown_content` なし）

