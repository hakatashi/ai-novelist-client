# setup-gcp-sa-key

firebase-action (w9jds/firebase-action) 用の `GCP_SA_KEY` を生成して GitHub Secrets に登録する。

## 前提条件

- `gcloud` CLI がプロジェクトオーナーアカウントでログイン済み
- `gh` CLI が `~/.config/gh` のトークン (project スコープ付き) で認証済み
- `gcloud config get project` で対象プロジェクトが設定済み

## 手順

### 1. 変数設定

```bash
PROJECT=$(gcloud config get project)
SA="github-actions-deploy@${PROJECT}.iam.gserviceaccount.com"
REPO="hakatashi/ai-novelist-client"
```

### 2. サービスアカウント作成

```bash
gcloud iam service-accounts create github-actions-deploy \
  --display-name="GitHub Actions Deploy"
```

### 3. IAM ロール付与

このプロジェクトで必要なロール (Functions + Firestore Rules/Indexes + Hosting):

```bash
for role in \
  "roles/iam.serviceAccountUser" \
  "roles/cloudfunctions.developer" \
  "roles/secretmanager.viewer" \
  "roles/firebaserules.admin" \
  "roles/datastore.indexAdmin" \
  "roles/firebase.admin" \
  "roles/serviceusage.serviceUsageViewer"; do
  gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="serviceAccount:$SA" --role="$role" --quiet
done
```

### 4. Cloud Billing API の有効化 (未有効の場合)

Firebase Functions (gen2) のデプロイ時に Firebase CLI が参照するため必要:

```bash
gcloud services enable cloudbilling.googleapis.com --project "$PROJECT"
```

### 5. JSON キー生成 → Base64 エンコード → GitHub Secrets 登録

```bash
TMPKEY=$(mktemp)
gcloud iam service-accounts keys create "$TMPKEY" --iam-account="$SA"
base64 -w 0 "$TMPKEY" | GITHUB_TOKEN="" gh secret set GCP_SA_KEY --repo "$REPO"
rm "$TMPKEY"
```

### 6. workflow の設定

`.github/workflows/*.yml` のデプロイジョブで `FIREBASE_TOKEN` を置き換える:

```yaml
env:
  GCP_SA_KEY: "${{ secrets.GCP_SA_KEY }}"
```

## 注意事項

- `gh` コマンドは `GITHUB_TOKEN=""` を先頭に付けて実行すること (project スコープを持つ `~/.config/gh` のトークンを使用するため)
- 旧来の functions が本番に残っている場合、非インタラクティブデプロイは失敗する。先に手動削除が必要:
  ```bash
  firebase functions:delete <関数名> --region us-central1 --project "$PROJECT" --force
  ```
- 同一コミットで CI を再実行すると Hosting が `FAILED_PRECONDITION: already current version` で失敗することがあるが、これは正常 (コンテンツ重複検知)。次の新しいコミットで解消される。
