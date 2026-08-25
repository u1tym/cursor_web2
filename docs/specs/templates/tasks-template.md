# タスク: ＜機能名＞

## 概要

対象機能: `<feature-name>`

ソース配置:

- フロントエンド: `src/features/<feature-name>/frontend`
- バックエンド: `src/features/<feature-name>/backend`
- テスト: `src/features/<feature-name>/tests`

関連要件:

- REQ-001
- REQ-002

---

## タスク 1

### タイトル

バックエンドの venv と FastAPI 起動口を用意する

### 見積もり

2時間（1〜4時間に収める）

### 関連要件

- REQ-001

### 関連設計

- `design.md` / バックエンド設計 / 起動

### 実装パス

- `src/features/<feature-name>/backend/app/main.py`
- `src/features/<feature-name>/backend/.env`（ひな型: `docs/specs/templates/backend.env.example`）

### 内容

venv を backend 配下に作成し、uvicorn で起動できるようにする。`.env` から DB と CORS を読む。

### 完了条件

- [ ] `backend/venv` が存在する
- [ ] `uvicorn app.main:app` で起動できる
- [ ] 秘密情報をソースに直書きしていない

---

## タスク 2

### タイトル

フロントエンドの Vue 起動と API 基点を環境変数にする

### 見積もり

2時間

### 関連要件

- REQ-001

### 関連設計

- `design.md` / フロントエンド設計 / API クライアント
- `api-design.md` / エンドポイント

### 実装パス

- `src/features/<feature-name>/frontend/`
- `src/features/<feature-name>/frontend/.env`（ひな型: `docs/specs/templates/frontend.env.example`）

### 内容

Vue アプリを frontend 配下で起動する。FastAPI の URL は `VITE_API_<FEATURE>_URL` のみを使う。画面なしの機能ではこのタスクを「画面なし」とし、完了条件をその旨に合わせる。

### 完了条件

- [ ] `VITE_API_<FEATURE>_URL` で API を呼ぶ
- [ ] API ホストをソースに直書きしていない

---

## テスト

### 単体テスト

- [ ] `src/features/<feature-name>/tests/` に配置する

### 結合テスト

- [ ] 当該機能の uvicorn に対する API テスト

### 受け入れテスト

- [ ] requirements.md の受け入れ条件を満たす

## 承認

現在の状態: 未承認

| 日時 | 状態 | 変更概要 |
|------|------|----------|
| ＜YYYY-MM-DD HH:mm＞ | 未承認 | 初版 |
