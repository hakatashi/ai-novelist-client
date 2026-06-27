# AGENTS.md — AI小説執筆支援ツール 設計・開発ガイド

このドキュメントは、AIエージェントや開発者がこのプロジェクトに追加作業を行う際に必要なコンテキストをまとめたものです。

---

## プロジェクト概要

個人向けのLLMを活用した小説執筆支援Webアプリ。執筆中の小説の続きをLLMに生成させながら書き継いでいく形式（NovelAI / AIのべりすと スタイル）。

**アクセス制限**: `hakatasiloving@gmail.com` のGoogleアカウントのみ使用可能。

---

## 現在の実装状況 (Phase 1)

### 実装済み機能

- Google認証 (Firebase Authentication) + メールアドレスによるアクセス制御
- 作品一覧ページ (`/`): 作品の作成・一覧表示
- 小説エディタ (`/novels/:id`): テキスト編集 + 2秒デバウンス自動保存
- Gemini APIによる続きの生成 (Firebase Functions経由)
- Firestoreへの生成履歴の記録
- セキュリティルール: 特定メールアドレスのみ全操作許可

---

## アーキテクチャ

### フロントエンド (Solid Start, SPA mode)

```
src/
  app.tsx              # FirebaseProvider > AuthGuard > Router
  lib/
    firebase.ts        # Firebase初期化。エクスポート: app, auth, db, functions, Novels, signInWithGoogle, signOutUser
    AuthGuard.tsx      # 認証ガード: loading/未ログイン/権限なし/OK の4ステート
    schema.d.ts        # 型定義: Novel, Generation, UseFireStoreReturn
    Collection.tsx     # Firestoreコレクション描画 (loading/error/empty/data の4ステート)
    Doc.tsx            # Firestoreドキュメント描画
  routes/
    index.tsx          # 作品一覧
    novels/[id].tsx    # エディタ (createMemo + useFirestore によるリアクティブなFirestore購読)
```

### バックエンド (Firebase Functions, Node.js 22)

```
functions/src/
  index.ts             # generateCompletion (v2 onCall): Gemini APIプロキシ
```

**Functions重要事項**:
- `firebase-functions/v2/https` の `onCall` を使用 (v2 API)
- `defineSecret('GEMINI_API_KEY')` でSecret Managerからキーを取得
- エミュレーター時は `functions/.env.ai-novelist-client` からキーを読む (Secret Managerは呼ばない)
- `request.auth.token.email` でメールアドレス検証をFunctionsレベルでも実施

### Firestoreデータ構造

```
novels/{novelId}
  novelId: string   # ドキュメントID (setDocで書き込み時に自動格納)
  title: string
  body: string
  uid: string       # Firebase Auth のUID
  createdAt: Timestamp
  updatedAt: Timestamp

novels/{novelId}/generations/{genId}
  prompt: string
  response: string
  model: 'gemini' | 'ollama' | 'ainovel'
  params: {temperature: number, maxTokens: number}
  createdAt: Timestamp
  durationMs: number
```

### セキュリティルール

`request.auth.token.email == 'hakatasiloving@gmail.com'` のみ全操作許可。Google Auth以外 (Anonymous等) は `token.email` が null になるので自動的に拒否される。

### Secret Manager 使用状況

| シークレット名 | 用途 | 利用フェーズ |
|---|---|---|
| `GEMINI_API_KEY` | Google AI Gemini API | Phase 1 (実装済み) |
| `AINOBEL_API_KEY` | AIのべりすとAPI JWT | Phase 2 (未実装) |

無料枠: 1プロジェクトあたり月6シークレットバージョンまで。現在2個使用予定。

---

## 開発コンテキスト・注意事項

### Solid.js特有の事項

- **`createMemo` + `useFirestore`**: リアクティブなFirestoreクエリには `createMemo()` でラップしたアクセサーを渡す
- **`initialized` フラグ**: エディタの `createEffect` でFirestoreデータを初期値としてセットする際、再レンダリングでユーザーの入力が上書きされないよう `initialized` フラグを使う
- **`useAuth(auth)` は `solid-firebase` の `useAuth`**: コンテキスト (`FirebaseProvider`) 不要、直接 `auth` インスタンスを渡す

### Biome lint (必須ルール)

- `bracketSpacing: false` → `{key: value}` (スペースなし)
- シングルクォート
- `useSelfClosingElements: error` → `<Foo />` (自己閉じ)
- `noNonNullAssertion: warn` → `!` アサーションは警告のみ (CIは通過する)
- import順: `@`スコープ → 外部パッケージ → `~/` エイリアス → 相対パス
- `noImportantStyles: error` → CSS `!important` は禁止

### tsconfig 注意事項

- `"allowImportingTsExtensions": true` が必要 (biome が `.ts` 拡張子を import パスに付与するため)
- `functions/` フォルダは root tsconfig から除外 (`"exclude": ["functions"]`)
- Functions の tsconfig は CommonJS (`"module": "commonjs"`)

### Firebase emulator 構成

| サービス | ポート |
|---|---|
| Firestore | 9935 |
| Auth | 9099 |
| Hosting | 5000 |
| Functions | 5001 |
| Emulator UI | 4000 |

---

## 将来の拡張計画

### Phase 2: 高度な生成機能

#### 追加LLMバックエンド

**Ollama (ローカル)**
- Functions から `http://host.docker.internal:11434/api/generate` に POST
- `model` フィールドに Ollama のモデル名 (例: `llama3`)
- エミュレーター環境では `localhost:11434` を使用

**AIのべりすと API**
- エンドポイント: https://api.ai-novel.com/api
- 認証: `Authorization: Bearer <AINOBEL_API_KEY>` (Secret Manager の `AINOBEL_API_KEY` を使用)
- APIリファレンス: https://ai-novel.com/account_api_help.php

#### 複数候補生成 (A)
- Functions の `generateCompletion` を拡張: `count` パラメータで複数候補を並列生成 (`Promise.all`)
- フロントエンド: 候補をカード表示し、テキストを選択・結合してエディタに取り込むUI

#### Fill-in-the-Middle (B)
- エディタでカーソル位置を取得し、前後のテキストを分割
- Gemini API の場合: プロンプト構築で `prefix + ___BLANK___ + suffix` を指定し、空欄を埋めさせる
- AIのべりすと API の場合: infix補完エンドポイントがあれば使用

#### Chat LLM擬似補完モード (C)
- 「最後の文」の自動判定: 末尾から最後の句点 (。) を探し、その次の文字位置以降を「最後の文」とする
- プロンプトテンプレートをバックエンドで構築し `generateContent` に送信
- フロントエンドに「生成スタイル入力欄」を追加 (サイドバーのAI設定パネル内)

### Phase 3: 閲覧・インポート機能

#### 作品閲覧画面 (`/novels/:id/read`)
- 日本語小説向けタイポグラフィ設定 (縦書き/横書き、フォント、文字サイズ、背景色)
- CSS `writing-mode: vertical-rl` で縦書き実装
- 設定は `localStorage` に保存

#### えあ草子連携
- Firebase Storage に青空文庫形式 `.txt` をアップロードし、公開URLを取得
- `https://www.satokazzz.com/airzoshi/reader.php?url=<encoded-url>&title=<title>&home=<appUrl>` を新タブで開く

#### インポート機能
- `.txt` (UTF-8): そのまま `body` にセット
- `.novel` (AIのべりすと形式): JSONパースして `body` を抽出
- UI: ドラッグ&ドロップ or ファイル選択

---

## 開発コマンド

```bash
npm run dev          # 開発サーバー + エミュレーター起動
npm run build        # フロントエンドビルド
npm run test         # Vitestテスト実行 (エミュレーター必須)
npm run lint         # Biome lint チェック
npm run fix          # Biome フォーマット + lint 自動修正
npm run deploy:all   # 全サービスをFirebaseにデプロイ
```

---

## CI/CD

- **test.yml**: push時に lint / format / tsc / build / test を実行し、`main` ブランチは自動デプロイ
- **環境変数**: `FUNCTIONS_DOTENV` シークレットに `functions/.env` の内容をCI上で設定
- **デプロイ**: Firebase Hosting (`FIREBASE_SERVICE_ACCOUNT_AI_NOVELIST_CLIENT`) + Firebase Functions/Firestore (`FIREBASE_TOKEN`)

---

## APIキー管理

**絶対にコードにハードコードしない**。

- **本番**: Google Cloud Secret Manager → Firebase Functions が実行時に取得 (`defineSecret`)
- **ローカル**: `functions/.env.ai-novelist-client` (gitignore済み)

本番へのシークレット設定:
```bash
echo -n "<API_KEY>" | gcloud secrets create GEMINI_API_KEY --data-file=-
```
