# Raw Files Bucket
resource "aws_s3_bucket" "raw_bucket" {
  bucket = "${var.project_name}-raw-files"
}

# React ke direct upload ke liye CORS setup
resource "aws_s3_bucket_cors_configuration" "raw_bucket_cors" {
  bucket = aws_s3_bucket.raw_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "GET"]
    allowed_origins = ["*"] # Production mein isse apne frontend URL se replace karein
    expose_headers  = []
    max_age_seconds = 3000
  }
}

# Processed/Compressed Files Bucket
resource "aws_s3_bucket" "processed_bucket" {
  bucket = "${var.project_name}-processed-files"
}

# DynamoDB Table Job Tracking ke liye
resource "aws_dynamodb_table" "jobs_table" {
  name         = "${var.project_name}-jobs"
  billing_mode = "PAY_PER_REQUEST" # Cost optimization (serverless billing)
  hash_key     = "job_id"

  attribute {
    name = "job_id"
    type = "S" # String
  }
}