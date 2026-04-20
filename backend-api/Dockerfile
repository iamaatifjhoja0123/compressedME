# AWS Lambda Node.js 18 Base Image
FROM public.ecr.aws/lambda/nodejs:18

# Copy package.json files
COPY package*.json ${LAMBDA_TASK_ROOT}/

# Install dependencies
RUN npm install --omit=dev

# Copy all files from src folder directly to Lambda root
COPY src/ ${LAMBDA_TASK_ROOT}/

# Lambda Handler point (ab directly index.js chalega)
CMD [ "index.handler" ]