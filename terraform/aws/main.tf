terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "social-ad-gen-tfstate"
    key            = "terraform/aws/terraform.tfstate"
    region         = "ap-northeast-1"
    dynamodb_table = "social-ad-gen-tfstate-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.region
}
