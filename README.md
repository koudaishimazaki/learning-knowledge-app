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

