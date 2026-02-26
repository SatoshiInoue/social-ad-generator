# Terraform Infrastructure

Terraform configurations for deploying the Social Ad Generator to **GCP Cloud Run** (`gcp/`) and **AWS App Runner** (`aws/`). Each provider is independent — deploy to one, both, or neither.

---

## Directory Structure

```
terraform/
├── gcp/        # GCP: Cloud Run, Cloud SQL, Artifact Registry, Secret Manager, WIF
├── aws/        # AWS: App Runner, RDS, ECR, Secrets Manager, OIDC
└── README.md   # This file
```

---

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.7
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) (for GCP)
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) (for AWS)

---

## GCP Bootstrap (one-time)

These steps are done once before the first `terraform apply`.

### 1. Create GCS bucket for Terraform state

```bash
gsutil mb -l asia-northeast1 gs://social-ad-gen-tfstate
gsutil versioning set on gs://social-ad-gen-tfstate
```

### 2. Enable required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  cloudresourcemanager.googleapis.com
```

### 3. Deploy infrastructure

```bash
cd terraform/gcp

terraform init
terraform plan \
  -var="project_id=YOUR_PROJECT_ID" \
  -var="github_repo=YOUR_ORG/YOUR_REPO" \
  -var="db_password=YOUR_DB_PASSWORD"

terraform apply \
  -var="project_id=YOUR_PROJECT_ID" \
  -var="github_repo=YOUR_ORG/YOUR_REPO" \
  -var="db_password=YOUR_DB_PASSWORD"
```

### 4. Populate secrets in Secret Manager

```bash
# Run once for each secret, replacing the value:
gcloud secrets versions add database-url     --data-file=<(echo -n "postgresql://app:PASSWORD@localhost/social_ad_generator?host=/cloudsql/PROJECT:REGION:social-ad-gen-db")
gcloud secrets versions add nextauth-url     --data-file=<(echo -n "https://YOUR_CLOUD_RUN_URL")
gcloud secrets versions add nextauth-secret  --data-file=<(openssl rand -base64 32)
gcloud secrets versions add google-client-id --data-file=<(echo -n "YOUR_VALUE")
# ... repeat for remaining 8 secrets
```

### 5. Set GitHub repository secrets

From the Terraform outputs:

```bash
terraform output workload_identity_provider   # → GCP_WORKLOAD_IDENTITY_PROVIDER
terraform output github_actions_service_account  # → GCP_SERVICE_ACCOUNT
```

Add to GitHub Settings → Secrets and variables → Actions:
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT`
- `GCP_PROJECT_ID`

### 6. Run Prisma migrations

```bash
DATABASE_URL="postgresql://app:PASSWORD@localhost/social_ad_generator?host=/cloudsql/..." \
  npx prisma migrate deploy
```

---

## AWS Bootstrap (one-time)

### 1. Create S3 bucket and DynamoDB table for Terraform state

```bash
aws s3api create-bucket \
  --bucket social-ad-gen-tfstate \
  --region ap-northeast-1 \
  --create-bucket-configuration LocationConstraint=ap-northeast-1

aws s3api put-bucket-versioning \
  --bucket social-ad-gen-tfstate \
  --versioning-configuration Status=Enabled

aws dynamodb create-table \
  --table-name social-ad-gen-tfstate-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-1
```

### 2. Bootstrap IAM role for Terraform (first apply only)

The first `terraform apply` must run with a user/role that has broad IAM permissions to create the OIDC provider and roles. After apply, subsequent runs use the GitHub Actions OIDC role.

```bash
cd terraform/aws

terraform init
terraform plan \
  -var="github_org=YOUR_ORG" \
  -var="github_repo=YOUR_REPO" \
  -var="db_password=YOUR_DB_PASSWORD"

terraform apply \
  -var="github_org=YOUR_ORG" \
  -var="github_repo=YOUR_REPO" \
  -var="db_password=YOUR_DB_PASSWORD"
```

### 3. Populate secrets in Secrets Manager

```bash
# Run once for each secret:
aws secretsmanager put-secret-value \
  --secret-id "social-ad-generator/DATABASE_URL" \
  --secret-string "postgresql://app:PASSWORD@RDS_ENDPOINT:5432/social_ad_generator"

aws secretsmanager put-secret-value \
  --secret-id "social-ad-generator/NEXTAUTH_URL" \
  --secret-string "https://YOUR_APP_RUNNER_URL"

# ... repeat for remaining 10 secrets
```

### 4. Set GitHub repository secrets

From Terraform outputs:

```bash
terraform output github_actions_role_arn  # → AWS_OIDC_ROLE_ARN
```

Add to GitHub Settings → Secrets and variables → Actions:
- `AWS_OIDC_ROLE_ARN`
- `AWS_REGION` (e.g. `ap-northeast-1`)

### 5. Run Prisma migrations

```bash
DATABASE_URL="postgresql://app:PASSWORD@RDS_ENDPOINT:5432/social_ad_generator" \
  npx prisma migrate deploy
```

---

## CI/CD Workflows

| Workflow | File | Trigger | Auth |
|----------|------|---------|------|
| GCP deploy | `.github/workflows/deploy-gcp.yml` | `workflow_dispatch` | WIF (keyless) |
| AWS deploy | `.github/workflows/deploy-aws.yml` | `workflow_dispatch` | OIDC (keyless) |

Both workflows accept a `terraform_action` input: `plan`, `apply`, or `destroy`.

---

## Secret Reference

| Environment Variable | GCP Secret ID | AWS Secret ID |
|---------------------|--------------|---------------|
| `DATABASE_URL` | `database-url` | `social-ad-generator/DATABASE_URL` |
| `NEXTAUTH_URL` | `nextauth-url` | `social-ad-generator/NEXTAUTH_URL` |
| `NEXTAUTH_SECRET` | `nextauth-secret` | `social-ad-generator/NEXTAUTH_SECRET` |
| `GOOGLE_CLIENT_ID` | `google-client-id` | `social-ad-generator/GOOGLE_CLIENT_ID` |
| `GOOGLE_CLIENT_SECRET` | `google-client-secret` | `social-ad-generator/GOOGLE_CLIENT_SECRET` |
| `GITHUB_CLIENT_ID` | `github-client-id` | `social-ad-generator/GITHUB_CLIENT_ID` |
| `GITHUB_CLIENT_SECRET` | `github-client-secret` | `social-ad-generator/GITHUB_CLIENT_SECRET` |
| `AWS_REGION` | `aws-region` | `social-ad-generator/AWS_REGION` |
| `AWS_ACCESS_KEY_ID` | `aws-access-key-id` | `social-ad-generator/AWS_ACCESS_KEY_ID` |
| `AWS_SECRET_ACCESS_KEY` | `aws-secret-access-key` | `social-ad-generator/AWS_SECRET_ACCESS_KEY` |
| `AWS_S3_BUCKET` | `aws-s3-bucket` | `social-ad-generator/AWS_S3_BUCKET` |
| `GOOGLE_GEMINI_API_KEY` | `google-gemini-api-key` | `social-ad-generator/GOOGLE_GEMINI_API_KEY` |
