# Secret Manager secrets for the 12 application environment variables.
# Secret values are managed outside Terraform (via gcloud or the Console) to avoid
# storing sensitive data in Terraform state. Only the secret resource shells are created here.

locals {
  secret_names = [
    "database-url",
    "nextauth-url",
    "nextauth-secret",
    "google-client-id",
    "google-client-secret",
    "github-client-id",
    "github-client-secret",
    "aws-region",
    "aws-access-key-id",
    "aws-secret-access-key",
    "aws-s3-bucket",
    "google-gemini-api-key",
  ]
}

resource "google_secret_manager_secret" "app" {
  for_each  = toset(local.secret_names)
  secret_id = each.key

  replication {
    auto {}
  }
}
