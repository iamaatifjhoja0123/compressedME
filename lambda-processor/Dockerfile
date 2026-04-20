# AWS Lambda Python Base Image
FROM public.ecr.aws/lambda/python:3.10

# Install Ghostscript for heavy PDF compression
RUN yum -y install ghostscript && yum clean all

# Copy requirements and install
COPY requirements.txt ${LAMBDA_TASK_ROOT}
RUN pip install -r requirements.txt

# Copy application code
COPY src/ ${LAMBDA_TASK_ROOT}/

# Set handler
CMD [ "handler.handler" ]