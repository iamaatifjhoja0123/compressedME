# Raw Files Bucket
resource "aws_s3_bucket" "raw_bucket" {
  bucket = "${var.project_name}-raw-files"
}

# Lifecycle Rule for Raw Bucket (Delete after 1 day & clear failed uploads)
resource "aws_s3_bucket_lifecycle_configuration" "raw_bucket_lifecycle" {
  bucket = aws_s3_bucket.raw_bucket.id

  rule {
    id     = "auto-delete-raw-files-after-24-hours"
    status = "Enabled"

    # YAHAN FIX HAI: Empty filter means apply to ALL objects in the bucket
    filter {} 

    expiration {
      days = 1
    }
    
    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
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

# Lifecycle Rule for Processed Bucket (Delete after 1 day)
resource "aws_s3_bucket_lifecycle_configuration" "processed_bucket_lifecycle" {
  bucket = aws_s3_bucket.processed_bucket.id

  rule {
    id     = "auto-delete-processed-files-after-24-hours"
    status = "Enabled"

    # YAHAN FIX HAI: Empty filter means apply to ALL objects in the bucket
    filter {}

    expiration {
      days = 1
    }
  }
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