variable "region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "service_name" {
  description = "App Runner service name"
  type        = string
  default     = "social-ad-generator"
}

variable "ecr_repository_name" {
  description = "ECR repository name"
  type        = string
  default     = "social-ad-generator"
}

variable "db_name" {
  description = "RDS database name"
  type        = string
  default     = "social_ad_generator"
}

variable "db_username" {
  description = "RDS master username"
  type        = string
  default     = "app"
}

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "github_org" {
  description = "GitHub organisation or user name"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name (without org prefix)"
  type        = string
}
