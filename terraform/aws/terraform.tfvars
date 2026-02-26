# Non-secret defaults — override github_org, github_repo for your environment.
# Never commit db_password here; pass it via TF_VAR_db_password env var or a .auto.tfvars file.

# github_org  = "your-github-org"
# github_repo = "your-repo-name"

region              = "ap-northeast-1"
service_name        = "social-ad-generator"
ecr_repository_name = "social-ad-generator"
db_name             = "social_ad_generator"
db_username         = "app"
