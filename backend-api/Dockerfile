# AWS Lambda ki official Node.js base image
FROM public.ecr.aws/lambda/nodejs:18

# Copy dependencies
COPY package*.json ${LAMBDA_TASK_ROOT}/

# Install dependencies
RUN npm install --production

# Copy application code
COPY src/ ${LAMBDA_TASK_ROOT}/src/

# Lambda Handler point karna
CMD [ "src/index.handler" ]