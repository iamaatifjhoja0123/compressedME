resource "aws_lambda_function" "processor_lambda" {
  function_name = "${var.project_name}-processor"
  role          = aws_iam_role.lambda_exec_role.arn
  
  # Lambda Container Image Use Karega
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.lambda_repo.repository_url}:latest"
  
  timeout       = 60  # Image/PDF processing mein thoda time lag sakta hai
  memory_size   = 512 # Pillow/PyMuPDF ko RAM chahiye hota hai

  environment {
    variables = {
      PROCESSED_BUCKET_NAME = aws_s3_bucket.processed_bucket.bucket
      DYNAMO_TABLE_NAME     = aws_dynamodb_table.jobs_table.name
    }
  }

  # DevOps pipeline jab image push karegi, toh Terraform isse override na kare
  lifecycle {
    ignore_changes = [image_uri]
  }
}

# S3 ko permission dena ki wo Lambda ko trigger kar sake
resource "aws_lambda_permission" "allow_s3_invocation" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.processor_lambda.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.raw_bucket.arn
}

# S3 Bucket Notification: Jab bhi 'raw' bucket me file aaye, Lambda chalao
resource "aws_s3_bucket_notification" "bucket_notification" {
  bucket = aws_s3_bucket.raw_bucket.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.processor_lambda.arn
    events              = ["s3:ObjectCreated:*"]
  }

  depends_on = [aws_lambda_permission.allow_s3_invocation]
}