# AWS Secrets Manager secrets for the 12 application environment variables.
# Secret values are set outside Terraform (via CLI or Console) to avoid storing
# sensitive data in Terraform state. Only the secret resource shells are created here.

locals {
  secret_names = [
    "DATABASE_URL",
    "NEXTAUTH_URL",
    "NEXTAUTH_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GITHUB_CLIENT_ID",
    "GITHUB_CLIENT_SECRET",
    "AWS_REGION",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_S3_BUCKET",
    "GOOGLE_GEMINI_API_KEY",
  ]
}

resource "aws_secretsmanager_secret" "app" {
  for_each = toset(local.secret_names)
  name     = "${var.service_name}/${each.key}"

  tags = { Service = var.service_name }
}
