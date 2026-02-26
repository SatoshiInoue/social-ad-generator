# Non-secret defaults — override project_id and github_repo for your environment.
# Never commit db_password here; pass it via TF_VAR_db_password env var or a .auto.tfvars file.

# project_id  = "your-gcp-project-id"
# github_repo = "your-org/your-repo"

region           = "asia-northeast1"
service_name     = "social-ad-generator"
repository_name  = "social-ad-gen"
db_instance_name = "social-ad-gen-db"
db_name          = "social_ad_generator"
db_user          = "app"
