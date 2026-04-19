# Lambda Assume Role (Lambda ko AWS services use karne ki ijazat dena)
resource "aws_iam_role" "lambda_exec_role" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# Basic Logging Permission (CloudWatch)
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Strict Custom Policy: S3 Read/Write & DynamoDB Update
resource "aws_iam_policy" "lambda_custom_policy" {
  name        = "${var.project_name}-lambda-policy"
  description = "Permissions for Lambda to read/write S3 and update DynamoDB"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # S3 Raw Bucket se sirf Read karna
        Effect = "Allow"
        Action = ["s3:GetObject"]
        Resource = "${aws_s3_bucket.raw_bucket.arn}/*"
      },
      {
        # S3 Processed Bucket mein Read aur Write dono karna
        Effect = "Allow"
        Action = ["s3:PutObject", "s3:GetObject"]
        Resource = "${aws_s3_bucket.processed_bucket.arn}/*"
      },
      {
        # DynamoDB mein Update karna
        Effect = "Allow"
        Action = ["dynamodb:UpdateItem"]
        Resource = aws_dynamodb_table.jobs_table.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "attach_custom_policy" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.lambda_custom_policy.arn
}