resource "aws_ecr_repository" "lambda_repo" {
  name                 = "${var.project_name}-lambda"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true # DevSecOps: Image push hote hi Trivy/AWS scan karega
  }
}

resource "aws_ecr_repository" "backend_repo" {
  name                 = "${var.project_name}-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}