terraform {
  # Yeh backend block Terraform ko batata hai ki state file AWS S3 mein save karni hai
  backend "s3" {
    bucket = "compressedme-tfstate-aatif"
    key    = "prod/terraform.tfstate"
    region = "ap-south-1"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}