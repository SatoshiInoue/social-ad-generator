# Google Cloud Run Deployment Guide

This guide walks you through deploying the Social Ad Generator to Google Cloud Run with automated CI/CD via GitHub Actions.

## Architecture Overview

```
GitHub (push to main)
  → GitHub Actions
    → Build Docker image
    → Push to Artifact Registry
    → Deploy to Cloud Run
          ↕ Cloud SQL Auth Proxy (automatic)
        Cloud SQL (PostgreSQL)
```

**Database**: Google Cloud SQL (managed PostgreSQL) — NOT inside the container. Cloud Run containers are ephemeral, so any in-container database is wiped on restart. Cloud SQL persists independently.

**Secrets**: All 12 app secrets live in Google Cloud Secret Manager. Cloud Run reads them directly at startup. Only 3 values are stored in GitHub.

---

## Prerequisites

- Google Cloud account with billing enabled
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) installed and authenticated: `gcloud auth login`
- Docker installed locally (for testing)
- Code pushed to a GitHub repository

Set your project ID for all commands below:
```bash
export PROJECT_ID="your-project-id"
export REGION="asia-northeast1"
gcloud config set project $PROJECT_ID
```

---

## Part 1 — One-time GCP Setup

### Step 1 — Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  cloudresourcemanager.googleapis.com
```

### Step 2 — Create Cloud SQL (PostgreSQL)

```bash
# Create the database instance (db-f1-micro = free tier eligible, 0.6GB RAM)
# Use db-g1-small or larger for production workloads
gcloud sql instances create social-ad-gen-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --storage-auto-increase \
  --backup-start-time=02:00

# Create the database
gcloud sql databases create social_ad_generator \
  --instance=social-ad-gen-db

# Create a database user
gcloud sql users create appuser \
  --instance=social-ad-gen-db \
  --password=CHOOSE_A_STRONG_PASSWORD
```

> Note the instance connection name for later — format is `PROJECT_ID:REGION:social-ad-gen-db`
> ```bash
> gcloud sql instances describe social-ad-gen-db --format='value(connectionName)'
> ```

### Step 3 — Apply Database Schema (one-time)

Install the Cloud SQL Auth Proxy to connect locally:

```bash
# macOS (Apple Silicon)
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.2/cloud-sql-proxy.darwin.arm64
chmod +x cloud-sql-proxy

# macOS (Intel)
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.2/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy
```

Authenticate and start the proxy:
```bash
gcloud auth application-default login

./cloud-sql-proxy $PROJECT_ID:$REGION:social-ad-gen-db --port=5433 &
```

Apply the schema (the proxy runs on port 5433 to avoid conflicts with local postgres):
```bash
DATABASE_URL="postgresql://appuser:CHOOSE_A_STRONG_PASSWORD@localhost:5433/social_ad_generator" \
  npx prisma db push
```

Stop the proxy when done:
```bash
pkill -f cloud-sql-proxy
```

### Step 4 — Create Artifact Registry Repository

```bash
gcloud artifacts repositories create social-ad-gen \
  --repository-format=docker \
  --location=$REGION \
  --description="Social Ad Generator Docker images"
```

### Step 5 — Create Cloud Run Runtime Service Account

This is the identity your running app uses to access GCP services.

```bash
# Create the service account
gcloud iam service-accounts create cloud-run-sa \
  --display-name="Cloud Run Runtime SA"

# Grant Secret Manager access (read secrets)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:cloud-run-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Grant Cloud SQL access (connect via proxy)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:cloud-run-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

### Step 6 — Store App Secrets in Secret Manager

Store each environment variable as a secret. Replace the values with your actual credentials.

```bash
# Database — use the Cloud SQL socket path for Cloud Run
# Format: postgresql://USER:PASSWORD@localhost/DB?host=/cloudsql/CONNECTION_NAME
echo -n "postgresql://appuser:CHOOSE_A_STRONG_PASSWORD@localhost/social_ad_generator?host=/cloudsql/$PROJECT_ID:$REGION:social-ad-gen-db" \
  | gcloud secrets create database-url --data-file=-

echo -n "$(openssl rand -base64 32)" \
  | gcloud secrets create nextauth-secret --data-file=-

# Set this to your Cloud Run URL AFTER first deploy (update via: gcloud secrets versions add nextauth-url --data-file=-)
echo -n "https://your-app-HASH-uc.a.run.app" \
  | gcloud secrets create nextauth-url --data-file=-

echo -n "your-google-client-id.apps.googleusercontent.com" \
  | gcloud secrets create google-client-id --data-file=-

echo -n "your-google-client-secret" \
  | gcloud secrets create google-client-secret --data-file=-

echo -n "your-github-client-id" \
  | gcloud secrets create github-client-id --data-file=-

echo -n "your-github-client-secret" \
  | gcloud secrets create github-client-secret --data-file=-

echo -n "us-east-1" \
  | gcloud secrets create aws-region --data-file=-

echo -n "your-aws-access-key-id" \
  | gcloud secrets create aws-access-key-id --data-file=-

echo -n "your-aws-secret-access-key" \
  | gcloud secrets create aws-secret-access-key --data-file=-

echo -n "your-s3-bucket-name" \
  | gcloud secrets create aws-s3-bucket --data-file=-

echo -n "your-gemini-api-key" \
  | gcloud secrets create google-gemini-api-key --data-file=-
```

> ⚠️ **DATABASE_URL format for Cloud Run**: Uses a Unix socket path (`/cloudsql/...`) instead of `localhost:5432`. The Cloud SQL Auth Proxy creates this socket automatically when you pass `--add-cloudsql-instances` to Cloud Run.

---

## Part 2 — GitHub Actions Setup (Workload Identity Federation)

WIF lets GitHub Actions authenticate to GCP without storing a service account JSON key anywhere. GitHub generates a short-lived OIDC token; GCP validates it.

### Step 1 — Create GitHub Actions Service Account

```bash
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Deployer"
```

Grant it the permissions needed to deploy:

```bash
# Deploy and manage Cloud Run services
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.developer"

# Push images to Artifact Registry
gcloud artifacts repositories add-iam-policy-binding social-ad-gen \
  --location=$REGION \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Impersonate the Cloud Run runtime SA when deploying
gcloud iam service-accounts add-iam-policy-binding \
  cloud-run-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

### Step 2 — Set Up Workload Identity Federation

```bash
# Get your project number (different from project ID)
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

# Create a WIF pool
gcloud iam workload-identity-pools create github \
  --project=$PROJECT_ID \
  --location=global \
  --display-name="GitHub Actions Pool"

# Create a WIF provider within the pool
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --project=$PROJECT_ID \
  --location=global \
  --workload-identity-pool=github \
  --display-name="GitHub Actions Provider" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.actor=assertion.actor,attribute.ref=assertion.ref" \
  --attribute-condition="assertion.repository=='YOUR_GITHUB_ORG/YOUR_REPO_NAME'"
```

Replace `YOUR_GITHUB_ORG/YOUR_REPO_NAME` with your actual GitHub org and repo (e.g., `satoshii/social-ad-generator`). This condition restricts access to only your repo.

### Step 3 — Bind the Pool to the Service Account

```bash
# Replace YOUR_GITHUB_ORG/YOUR_REPO_NAME below
gcloud iam service-accounts add-iam-policy-binding \
  github-actions@$PROJECT_ID.iam.gserviceaccount.com \
  --project=$PROJECT_ID \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/YOUR_GITHUB_ORG/YOUR_REPO_NAME"
```

### Step 4 — Get the WIF Provider Resource Name

You'll need this for GitHub secrets:

```bash
gcloud iam workload-identity-pools providers describe github-provider \
  --project=$PROJECT_ID \
  --location=global \
  --workload-identity-pool=github \
  --format='value(name)'
```

Output looks like: `projects/123456789/locations/global/workloadIdentityPools/github/providers/github-provider`

### Step 5 — Add GitHub Repository Secrets

In your GitHub repository: **Settings → Secrets and variables → Actions → New repository secret**

Add these 3 secrets:

| Secret name | Value |
|-------------|-------|
| `GCP_PROJECT_ID` | Your project ID (e.g., `my-project-123`) |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Output from Step 4 above |
| `GCP_SERVICE_ACCOUNT` | `github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com` |

---

## Part 3 — First Deploy

Push to `main` to trigger the workflow:

```bash
git add .
git commit -m "Add Cloud Run deployment configuration"
git push origin main
```

Watch the workflow run: **GitHub → Actions tab → Deploy to Cloud Run**

After it completes (~5–8 minutes for the first build), find your Cloud Run URL:

```bash
gcloud run services describe social-ad-generator \
  --region=$REGION \
  --format='value(status.url)'
```

### Update NEXTAUTH_URL secret

Once you have the Cloud Run URL, update the secret:

```bash
echo -n "https://YOUR-CLOUD-RUN-URL" \
  | gcloud secrets versions add nextauth-url --data-file=-
```

Then redeploy (push a trivial commit to main, or manually trigger the workflow).

---

## Part 4 — Update OAuth Callback URLs

### Google OAuth

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Click your OAuth 2.0 client
3. Add to **Authorized JavaScript origins**: `https://your-app-HASH-uc.a.run.app`
4. Add to **Authorized redirect URIs**: `https://your-app-HASH-uc.a.run.app/api/auth/callback/google`
5. Click **Save**

### GitHub OAuth

1. Go to [GitHub → Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Click your app
3. Update **Homepage URL**: `https://your-app-HASH-uc.a.run.app`
4. Update **Authorization callback URL**: `https://your-app-HASH-uc.a.run.app/api/auth/callback/github`
5. Click **Update application**

### S3 CORS

Add the Cloud Run URL to your S3 bucket's CORS config (AWS Console → S3 → your bucket → Permissions → CORS):

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-app-HASH-uc.a.run.app"
    ],
    "ExposeHeaders": ["ETag"]
  }
]
```

---

## Part 5 — Notes & Limits

### Memory

`--memory=2Gi` is required in the deploy command. `@napi-rs/canvas` and `sharp` are memory-intensive native binaries that cause OOM crashes at the default 512MB.

### Request Timeout

Cloud Run's default request timeout is 5 minutes. The AI generation endpoint can take 30–60s, which is fine. If you hit limits, increase it:
```bash
gcloud run services update social-ad-generator \
  --region=$REGION \
  --timeout=300
```

### Scaling to Zero

Cloud Run scales to zero by default (`--min-instances=0`). This means cold starts (~3–5s for this app). To eliminate cold starts at the cost of ~$10–20/month:
```bash
gcloud run services update social-ad-generator \
  --region=$REGION \
  --min-instances=1
```

### Updating Secrets

To rotate or update any secret value:
```bash
echo -n "new-value" | gcloud secrets versions add SECRET_NAME --data-file=-
```
The next Cloud Run deployment will pick up the new `latest` version automatically.

### Custom Domain

To map a custom domain instead of the `.run.app` URL:
```bash
gcloud run domain-mappings create \
  --service=social-ad-generator \
  --domain=yourdomain.com \
  --region=$REGION
```

---

## Troubleshooting

### Workflow fails: "Permission denied on Artifact Registry"
- Verify the `github-actions` SA has `roles/artifactregistry.writer` on the `social-ad-gen` repository
- Check the WIF `--attribute-condition` matches your exact GitHub org/repo name

### Workflow fails: "Unable to impersonate service account"
- Verify `roles/iam.serviceAccountUser` is granted on `cloud-run-sa` (not the project)

### Container crashes on startup (OOM)
- Increase memory: edit `deploy.yml` and change `--memory=2Gi` to `--memory=4Gi`

### "OAuth redirect URI mismatch"
- Check OAuth callback URLs in Google/GitHub exactly match the Cloud Run URL (no trailing slash)

### Database connection refused
- Verify `--add-cloudsql-instances` in `deploy.yml` uses the correct instance connection name
- Verify `DATABASE_URL` secret uses Unix socket format: `?host=/cloudsql/PROJECT:REGION:INSTANCE`
- Verify `cloud-run-sa` has `roles/cloudsql.client`
