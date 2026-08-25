# 設計: ＜機能名＞

## 概要

この設計書が対象とする機能の概要。`requirements.md` の REQ-xxx を満たすことだけを書く。

API のパス・要求・応答は `api-design.md`、テーブル定義と ER 図は `db-design.md` に書く。

## 構成

- フロントエンド: `src/features/<feature-name>/frontend` で Vue を起動
- バックエンド: `src/features/<feature-name>/backend` の venv で uvicorn を起動
- API 基点: フロントの `VITE_API_<FEATURE>_URL`（例: `voice` なら `VITE_API_VOICE_URL`）
- DB スキーマ: `<feature_name>`（kebab-case の機能名を snake_case にしたもの）。詳細は `db-design.md`

関連ドキュメント:

- DB設計: `db-design.md`
- API設計: `api-design.md`

## フロントエンド設計

画面が無い場合は「画面なし」と書き、以下の小節は「なし」とする。

### 画面

| 画面 | パス | 説明 |
|------|------|------|
| ＜画面名＞ | `/＜path＞` | ＜役割＞ |

### コンポーネント

### 状態管理

### バリデーション

### API クライアント

- 基点 URL: `import.meta.env.VITE_API_<FEATURE>_URL`
- API ホストをコードに直書きしない
- エンドポイントの契約は `api-design.md`

## バックエンド設計

### 起動

- 作業ディレクトリ: `src/features/<feature-name>/backend`
- 仮想環境: `venv/`
- 起動: `uvicorn app.main:app --reload --port ＜ポート＞`

### モジュール構成

| ファイル | 役割 |
|----------|------|
| `app/main.py` | FastAPI 生成、CORS 設定、ルータ登録 |

エンドポイントの契約は `api-design.md`。テーブルは `db-design.md`。

### 業務ロジック

### データアクセス

テーブル定義は `db-design.md`。ここにはアクセス関数の役割だけを書く。テーブルが無い場合は「なし」。

### 認証 / 認可

この機能で認証しない場合は「認証しない」と書く。必要な場合のみ、方式と対象範囲を書く。

## 要件トレーサビリティ

| 要件 | 設計 |
|------|------|
| REQ-001 | ＜画面またはモジュール＞ |
| REQ-002 | ＜画面またはモジュール＞ |

API 側の対応は `api-design.md`、テーブル側は `db-design.md`。

## 未決事項

-

## 承認

現在の状態: 未承認

| 日時 | 状態 | 変更概要 |
|------|------|----------|
| ＜YYYY-MM-DD HH:mm＞ | 未承認 | 初版 |
