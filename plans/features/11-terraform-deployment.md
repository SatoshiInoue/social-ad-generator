# Feature 11: Terraform Deployment (AWS & GCP)

## Dependencies
- **01 Foundation** (application must be buildable and deployable)

## Blocks
None.

## Can Be Parallel With
- **06 Canvas Editor**
- **07 Compliance Scoring**
- **08 Localization**
- **09 Export**
- **10 Campaign History**

## Scope

Infrastructure-as-code deployment of the Social Ad Generator to both **GCP Cloud Run** and **AWS App Runner** using Terraform, with GitHub Actions CI/CD workflows. Each cloud provider has its own independent Terraform configuration and workflow. The GCP configuration is a fresh deployment (not importing the existing manually-provisioned resources). Both providers use OIDC keyless authentication from GitHub Actions.

---

## Directory Structure

```
terraform/
├── gcp/
│   ├── main.tf              # Provider, backend (GCS)
│   ├── variables.tf         # Input variables
│   ├── outputs.tf           # Cloud Run URL, etc.
│   ├── terraform.tfvars     # Non-secret defaults
│   ├── database.tf          # Cloud SQL PostgreSQL 15
│   ├── registry.tf          # Artifact Registry
│   ├── secrets.tf           # Secret Manager (12 secrets)
│   ├── iam.tf               # Service accounts + WIF
│   └── cloud_run.tf         # Cloud Run v2 service
├── aws/
│   ├── main.tf              # Provider, backend (S3 + DynamoDB)
│   ├── variables.tf         # Input variables
│   ├── outputs.tf           # App Runner URL, etc.
│   ├── terraform.tfvars     # Non-secret defaults
│   ├── database.tf          # RDS PostgreSQL 15
│   ├── network.tf           # VPC + subnets (for RDS only)
│   ├── registry.tf          # ECR repository
│   ├── secrets.tf           # AWS Secrets Manager (12 secrets)
│   ├── iam.tf               # App Runner roles + GitHub OIDC
│   └── apprunner.tf         # App Runner service
└── README.md
.github/workflows/
├── deploy-gcp.yml           # Replaces existing deploy.yml
└── deploy-aws.yml           # New AWS workflow
```

---

## Secrets (12 per provider)

Both GCP Secret Manager and AWS Secrets Manager store the same 12 application secrets:

| # | Secret Name | Description |
|---|-------------|-------------|
| 1 | `DATABASE_URL` | PostgreSQL connection string |
| 2 | `NEXTAUTH_URL` | Public URL of the deployed app |
| 3 | `NEXTAUTH_SECRET` | NextAuth session signing key |
| 4 | `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| 5 | `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| 6 | `GITHUB_CLIENT_ID` | GitHub OAuth client ID |
| 7 | `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret |
| 8 | `AWS_REGION` | AWS region for S3 media storage |
| 9 | `AWS_ACCESS_KEY_ID` | AWS IAM access key (for S3) |
| 10 | `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key (for S3) |
| 11 | `AWS_S3_BUCKET` | S3 bucket name for media uploads |
| 12 | `GOOGLE_GEMINI_API_KEY` | Gemini API key for AI generation |

---

## GCP Terraform Resources (~15 resources)

| File | Resources | Notes |
|------|-----------|-------|
| `main.tf` | `google` provider, GCS backend | Region: `asia-northeast1` |
| `database.tf` | `google_sql_database_instance`, `google_sql_database`, `google_sql_user` | PostgreSQL 15, `db-f1-micro` |
| `registry.tf` | `google_artifact_registry_repository` | Docker format, `social-ad-gen` |
| `secrets.tf` | 12× `google_secret_manager_secret` + `google_secret_manager_secret_version` | Initial values set via `terraform.tfvars` or manual |
| `iam.tf` | `google_service_account` (Cloud Run SA), `google_service_account` (GitHub Actions SA), `google_iam_workload_identity_pool`, `google_iam_workload_identity_pool_provider`, IAM bindings | WIF for keyless GitHub Actions auth |
| `cloud_run.tf` | `google_cloud_run_v2_service`, `google_cloud_run_service_iam_member` (public invoker) | 2 GiB / 1 vCPU, port 8080, Cloud SQL connection, secrets as env vars |

---

## AWS Terraform Resources (~15 resources)

App Runner eliminates the need for ALB, NAT gateway, or ECS cluster.

| File | Resources | Notes |
|------|-----------|-------|
| `main.tf` | `aws` provider, S3 + DynamoDB backend | Region: `ap-northeast-1` |
| `network.tf` | `aws_vpc`, `aws_subnet` (2 private), `aws_security_group` | For RDS access only |
| `database.tf` | `aws_db_instance`, `aws_db_subnet_group` | PostgreSQL 15, `db.t3.micro` |
| `registry.tf` | `aws_ecr_repository`, `aws_ecr_lifecycle_policy` | Keep last 10 images |
| `secrets.tf` | 12× `aws_secretsmanager_secret` + `aws_secretsmanager_secret_version` | Same 12 secrets as GCP |
| `iam.tf` | `aws_iam_role` (App Runner access role), `aws_iam_role` (instance role), `aws_iam_openid_connect_provider` (GitHub OIDC), `aws_iam_role` (GitHub Actions role) | OIDC for keyless GitHub Actions auth |
| `apprunner.tf` | `aws_apprunner_service`, `aws_apprunner_vpc_connector` | ECR source, 2 GB / 1 vCPU, port 8080, min 1 / max 5 instances, auto-deploy on ECR push |

---

## GitHub Actions Workflows

### deploy-gcp.yml

Replaces the existing `.github/workflows/deploy.yml`. Trigger: `workflow_dispatch` with `terraform_action` input (`plan` / `apply` / `destroy`).

**Job 1 — `terraform`:**
1. Checkout code
2. Authenticate to GCP via Workload Identity Federation (OIDC)
3. Setup Terraform
4. `terraform init` (GCS backend)
5. `terraform validate`
6. `terraform plan`
7. `terraform apply -auto-approve` (only when `terraform_action == apply`)

**Job 2 — `build-and-deploy`** (runs after `terraform`, only when `terraform_action == apply`):
1. Checkout code
2. Authenticate to GCP via WIF
3. Configure Docker for Artifact Registry
4. Build Docker image (tagged with `${{ github.sha }}` and `latest`)
5. Push to Artifact Registry
6. Deploy to Cloud Run via `gcloud run deploy`

**GitHub Secrets required:**
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT`
- `GCP_PROJECT_ID`

### deploy-aws.yml

New workflow. Trigger: `workflow_dispatch` with `terraform_action` input (`plan` / `apply` / `destroy`).

**Job 1 — `terraform`:**
1. Checkout code
2. Configure AWS credentials via OIDC
3. Setup Terraform
4. `terraform init` (S3 backend)
5. `terraform validate`
6. `terraform plan`
7. `terraform apply -auto-approve` (only when `terraform_action == apply`)

**Job 2 — `build-and-deploy`** (runs after `terraform`, only when `terraform_action == apply`):
1. Checkout code
2. Configure AWS credentials via OIDC
3. Login to ECR
4. Build Docker image (tagged with `${{ github.sha }}` and `latest`)
5. Push to ECR (App Runner auto-deploys on new image)

**GitHub Secrets required:**
- `AWS_OIDC_ROLE_ARN`
- `AWS_REGION`

---

## Tasks

### Bootstrap (manual, one-time)
- [ ] Create GCS bucket for GCP Terraform state (`social-ad-gen-tfstate`)
- [ ] Create S3 bucket + DynamoDB table for AWS Terraform state
- [ ] Set GitHub repository secrets for GCP (`GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`, `GCP_PROJECT_ID`)
- [ ] Set GitHub repository secrets for AWS (`AWS_OIDC_ROLE_ARN`, `AWS_REGION`)

### GCP Terraform
- [ ] `terraform/gcp/main.tf` — provider config, GCS backend
- [ ] `terraform/gcp/variables.tf` — project_id, region, service_name, db credentials
- [ ] `terraform/gcp/outputs.tf` — Cloud Run URL, Cloud SQL connection name
- [ ] `terraform/gcp/terraform.tfvars` — non-secret default values
- [ ] `terraform/gcp/database.tf` — Cloud SQL PostgreSQL 15 instance, database, user
- [ ] `terraform/gcp/registry.tf` — Artifact Registry Docker repository
- [ ] `terraform/gcp/secrets.tf` — 12 Secret Manager secrets with versions
- [ ] `terraform/gcp/iam.tf` — Cloud Run SA, GitHub Actions SA, WIF pool + provider, IAM bindings
- [ ] `terraform/gcp/cloud_run.tf` — Cloud Run v2 service with secrets, Cloud SQL, public access

### AWS Terraform
- [ ] `terraform/aws/main.tf` — provider config, S3 + DynamoDB backend
- [ ] `terraform/aws/variables.tf` — region, service_name, db credentials
- [ ] `terraform/aws/outputs.tf` — App Runner URL, RDS endpoint, ECR URI
- [ ] `terraform/aws/terraform.tfvars` — non-secret default values
- [ ] `terraform/aws/network.tf` — VPC, 2 private subnets, security group for RDS
- [ ] `terraform/aws/database.tf` — RDS PostgreSQL 15 (db.t3.micro), subnet group
- [ ] `terraform/aws/registry.tf` — ECR repository with lifecycle policy (keep 10 images)
- [ ] `terraform/aws/secrets.tf` — 12 Secrets Manager secrets with versions
- [ ] `terraform/aws/iam.tf` — App Runner roles (access + instance), GitHub OIDC provider + role
- [ ] `terraform/aws/apprunner.tf` — App Runner service with VPC connector, ECR source, auto-scaling

### GitHub Actions Workflows
- [ ] `.github/workflows/deploy-gcp.yml` — Terraform + build/deploy workflow for GCP
- [ ] `.github/workflows/deploy-aws.yml` — Terraform + build/deploy workflow for AWS
- [ ] Remove or archive existing `.github/workflows/deploy.yml`

### Documentation & Migration
- [ ] `terraform/README.md` — setup instructions, bootstrap steps, usage guide
- [ ] Run Prisma migration on new databases (`npx prisma migrate deploy`)
- [ ] Populate secret values in both providers' Secret Manager
- [ ] Verify deployment to GCP via new workflow
- [ ] Verify deployment to AWS via new workflow

---

## Key Files

| File | Purpose |
|------|---------|
| `terraform/gcp/*.tf` | GCP infrastructure (Cloud Run, Cloud SQL, Artifact Registry, IAM, Secrets) |
| `terraform/aws/*.tf` | AWS infrastructure (App Runner, RDS, ECR, VPC, IAM, Secrets) |
| `.github/workflows/deploy-gcp.yml` | GCP CI/CD workflow (Terraform + Docker deploy) |
| `.github/workflows/deploy-aws.yml` | AWS CI/CD workflow (Terraform + Docker deploy) |
| `terraform/README.md` | Bootstrap and usage documentation |
| `Dockerfile` | Existing multi-stage build (no changes needed) |

## Packages

No additional npm packages. Terraform CLI (~1.7+) is installed in GitHub Actions via `hashicorp/setup-terraform`.

## Verification

1. Run `terraform init` and `terraform validate` in both `terraform/gcp/` and `terraform/aws/` — no errors
2. Run `terraform plan` in `terraform/gcp/` — verify ~15 resources to create
3. Run `terraform plan` in `terraform/aws/` — verify ~15 resources to create
4. Trigger `deploy-gcp.yml` with `terraform_action: apply` — verify infra created and app deployed
5. Visit the GCP Cloud Run URL — verify app loads and auth works
6. Trigger `deploy-aws.yml` with `terraform_action: apply` — verify infra created and app deployed
7. Visit the AWS App Runner URL — verify app loads and auth works
8. Verify all 12 secrets are accessible as env vars in both environments
9. Verify database connectivity (Prisma migrations applied, data persists)
10. Trigger both workflows with `terraform_action: destroy` — verify clean teardown
