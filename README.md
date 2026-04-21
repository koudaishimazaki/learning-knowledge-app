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

