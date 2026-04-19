# ==========================================
# 1. S3 Bucket for React Frontend
# ==========================================
resource "aws_s3_bucket" "frontend_bucket" {
  bucket = "${var.project_name}-frontend-app"
}

# Bucket ko public access se block karna (Security Best Practice)
resource "aws_s3_bucket_public_access_block" "frontend_block" {
  bucket                  = aws_s3_bucket.frontend_bucket.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ==========================================
# 2. CloudFront Origin Access Control (OAC)
# ==========================================
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${var.project_name}-frontend-oac"
  description                       = "OAC policy for React S3 Bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ==========================================
# 3. CloudFront Distribution (CDN)
# ==========================================
resource "aws_cloudfront_distribution" "react_cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # Cheapest option (USA, Europe, Asia)

  origin {
    domain_name              = aws_s3_bucket.frontend_bucket.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
    origin_id                = "S3-${aws_s3_bucket.frontend_bucket.bucket}"
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.frontend_bucket.bucket}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    viewer_protocol_policy = "redirect-to-https" # Force HTTPS
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  # React Router (SPA) ke liye zaroori: 403/404 errors ko index.html par bhejna
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true # Free SSL Certificate
  }
}

# ==========================================
# 4. S3 Bucket Policy (Allow CloudFront)
# ==========================================
resource "aws_s3_bucket_policy" "frontend_bucket_policy" {
  bucket = aws_s3_bucket.frontend_bucket.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend_bucket.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.react_cdn.arn
          }
        }
      }
    ]
  })
}

# Website ka final URL display karne ke liye
output "website_url" {
  value       = "https://${aws_cloudfront_distribution.react_cdn.domain_name}"
  description = "Aapki React Website ka Live URL"
}