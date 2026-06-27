# AI小説執筆支援ツール

LLMを活用した個人向け小説執筆支援Webアプリケーション。「NovelAI」や「AIのべりすと」のように、執筆中の小説の続きをLLMに生成させながら書き継いでいく形式のツールです。

## 機能

- **Google認証**: 特定ユーザーのみアクセス可能なプライベートアプリ
- **作品管理**: Firestoreに複数の作品を保存・一覧表示
- **AIテキスト補完**: Gemini APIによる続きの自動生成
- **自動保存**: 2秒デバウンスでFirestoreへ自動保存

## 技術スタック

| 層 | 技術 |
|---|---|
| フロントエンド | [Solid Start](https://start.solidjs.com/) (SPA mode) |
| バックエンド | Firebase Functions (Node.js 22) |
| データベース | Cloud Firestore |
| 認証 | Firebase Authentication (Google) |
| シークレット管理 | Google Cloud Secret Manager |
| ホスティング | Firebase Hosting |
| ビルドツール | Vinxi / Vite |
| Linter/Formatter | Biome |

## ローカル開発

### 必要条件

- Node.js >= 22
- Firebase CLI (`npm install -g firebase-tools`)
- Java 21 (Firebase emulator用)

### セットアップ

```bash
# 依存インストール
npm install
npm --prefix functions install

# ローカル開発サーバー起動 (Solidフロントエンド + Firebaseエミュレーター + Functions watch)
npm run dev
```

開発サーバー: http://localhost:3000  
Firebase Emulator UI: http://localhost:4000

### Gemini APIキーの設定（ローカル）

`functions/.env.ai-novelist-client` に以下を設定（gitignore済み）:

```
GEMINI_API_KEY=<your-gemini-api-key>
```

### テスト実行

```bash
npm run test
```

### Lint / Format

```bash
npm run fix    # フォーマット + Lintの自動修正
npm run lint   # チェックのみ
```

## デプロイ

```bash
npm run deploy:all
```

CIは `main` ブランチへのpush時に自動デプロイします。

## プロジェクト構成

```
src/
  app.tsx              # ルートコンポーネント (FirebaseProvider + AuthGuard)
  lib/
    firebase.ts        # Firebase初期化 (auth, db, functions, Novels)
    AuthGuard.tsx      # 認証ガード (未ログイン/権限なし/OK の3ステート)
    schema.d.ts        # 型定義 (Novel, Generation)
    Collection.tsx     # Firestoreコレクション表示コンポーネント
    Doc.tsx            # Firestoreドキュメント表示コンポーネント
  routes/
    index.tsx          # 作品一覧ページ
    novels/
      [id].tsx         # 小説エディタページ

functions/src/
  index.ts             # generateCompletion 関数 (Gemini API プロキシ)

firestore.rules        # セキュリティルール (特定メールのみ許可)
```

## アーキテクチャ詳細

詳細は `AGENTS.md` を参照してください。
