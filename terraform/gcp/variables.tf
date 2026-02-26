variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "asia-northeast1"
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "social-ad-generator"
}

variable "repository_name" {
  description = "Artifact Registry repository name"
  type        = string
  default     = "social-ad-gen"
}

variable "db_instance_name" {
  description = "Cloud SQL instance name"
  type        = string
  default     = "social-ad-gen-db"
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "social_ad_generator"
}

variable "db_user" {
  description = "PostgreSQL user"
  type        = string
  default     = "app"
}

variable "db_password" {
  description = "PostgreSQL password"
  type        = string
  sensitive   = true
}

variable "github_repo" {
  description = "GitHub repository in owner/repo format (for WIF subject)"
  type        = string
}
