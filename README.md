# 🚀 CompressedME - Serverless File Optimization Pipeline

![AWS Architecture](https://img.shields.io/badge/AWS-Serverless-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)
![Terraform](https://img.shields.io/badge/Terraform-IaC-7B42BC?style=for-the-badge&logo=terraform&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![React](https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Python](https://img.shields.io/badge/Python-Processor-3776AB?style=for-the-badge&logo=python&logoColor=white)

**Live Application:** [https://compressedme.jhoja.tech](https://compressedme.jhoja.tech/)

## 📝 Project Overview
CompressedME is an enterprise-grade, highly scalable, serverless web application designed to compress images (JPG, PNG, WEBP, JFIF) and documents (PDFs). Built entirely on AWS using **Infrastructure as Code (IaC)**, it focuses heavily on cost-optimization, data privacy, and DevSecOps best practices.

## ☁️ Cloud Architecture & DevOps Workflows

### 1. Serverless Compute & Processing
* **AWS Lambda (Containerized):** The core compression engine runs as a Docker container stored in **Amazon ECR**. It leverages Python's `Pillow` for advanced image optimization and `Ghostscript` (via shell execution) for aggressive, industry-standard PDF compression.
* **Amazon DynamoDB:** A NoSQL database used to track real-time job statuses (UPLOADING, PROCESSING, COMPLETED, ERROR) avoiding long-polling timeouts.

### 2. Secure Storage & Delivery
* **Amazon S3:** Dual-bucket architecture (`Raw` and `Processed`) utilizing temporary Pre-signed URLs for both uploading and downloading.
* **Amazon CloudFront & OAC:** Global CDN distribution mapped to a custom domain with an **AWS ACM** SSL certificate. S3 buckets are completely private and only accessible via CloudFront Origin Access Control (OAC).

### 3. DevSecOps & Security Best Practices
* **100% Infrastructure as Code:** All AWS resources (S3, CloudFront, API Gateway, DynamoDB, IAM Roles) are provisioned and managed using **Terraform**.
* **Zero Trust & Secrets Management:** No IAM credentials or `.pem` files are hardcoded. All sensitive data was rotated and is now strictly managed via GitHub Actions Secrets.
* **Cost & Data Privacy Lifecycle:** Automated **S3 Lifecycle Rules** are implemented to permanently delete user files after 24 hours, ensuring strict data privacy and zero stagnant storage costs.
* **Forced Downloads:** Implemented `ResponseContentDisposition` headers in S3 Presigned URLs to prevent browser rendering and enforce secure, direct downloads.

### 4. CI/CD Pipeline (GitOps)
* **GitHub Actions:** Automated pipeline that triggers on push to the `main` branch.
  * **Build Stage:** Builds the Docker image for the Lambda processor.
  * **Push Stage:** Pushes the latest image to AWS ECR.
  * **Deploy Stage:** Updates the Lambda function code on-the-fly to ensure zero-downtime deployments.

## 📂 Repository Structure

├── .github/workflows/   # CI/CD Pipelines (deploy.yml)
├── frontend/            # React.js UI + Tailwind CSS (Vite)
├── lambda-processor/    # Python code, Dockerfile, requirements.txt
├── terraform/           # IaC (.tf files: s3, cloudfront, api_gateway, iam)
└── README.md


## 🛠️ Tech Stack Details
* **Frontend:** React.js, Tailwind CSS v4, Lucide Icons, Axios.
* **Backend:** AWS API Gateway, AWS Lambda.
* **Processing:** Python 3.10, Pillow, PyMuPDF (fitz), Ghostscript.
* **Cloud Platform:** AWS (ap-south-1 & us-east-1).
* **IaC & Automation:** Terraform, GitHub Actions.

## ⚙️ Local Development & Deployment

### 1. Provision Infrastructure
cd terraform
terraform init
terraform plan
terraform apply --auto-approve

### 2. Deploy Lambda Processor
cd lambda-processor
docker build -t compressedme-processor .
docker tag compressedme-processor:latest <your-ecr-uri>:latest
docker push <your-ecr-uri>:latest
aws lambda update-function-code --function-name <lambda-name> --image-uri <your-ecr-uri>:latest

### 3. Deploy Frontend
cd frontend
npm install
npm run build
aws s3 sync dist/ s3://<your-frontend-bucket> --delete
aws cloudfront create-invalidation --distribution-id <your-cloudfront-id> --paths "/*"

---
*Architected and developed by [Mohd Aatif Jhoja](www.linkedin.com/in/mohd-aatif-jhoja) | Cloud & DevOps Engineer*