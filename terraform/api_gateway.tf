# 1. Node.js Backend Lambda Function
resource "aws_lambda_function" "backend_api_lambda" {
  function_name = "${var.project_name}-backend-api"
  role          = aws_iam_role.lambda_exec_role.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.backend_repo.repository_url}:latest"
  timeout       = 30

  environment {
    variables = {
      RAW_BUCKET_NAME   = aws_s3_bucket.raw_bucket.bucket
      DYNAMO_TABLE_NAME = aws_dynamodb_table.jobs_table.name
      NODE_ENV          = "lambda" # Yeh bata raha hai ki app Lambda me hai
    }
  }

  lifecycle {
    ignore_changes = [image_uri]
  }
}

# 2. HTTP API Gateway (Fast & Cheap)
resource "aws_apigatewayv2_api" "http_api" {
  name          = "${var.project_name}-http-api"
  protocol_type = "HTTP"
  
  # CORS set karna taaki React App (S3/CloudFront) access kar sake
  cors_configuration {
    allow_origins = ["*"] # Production mein isse CloudFront URL se replace karein
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
  }
}

# 3. Connect API Gateway to Lambda
resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id           = aws_apigatewayv2_api.http_api.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.backend_api_lambda.invoke_arn
}

resource "aws_apigatewayv2_route" "default_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "api_gw_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend_api_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

# Hamein React ke liye yeh API URL output mein chahiye
output "backend_api_url" {
  value       = aws_apigatewayv2_api.http_api.api_endpoint
  description = "Aapka Serverless API Gateway URL"
}