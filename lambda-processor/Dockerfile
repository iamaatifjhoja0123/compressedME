# AWS Lambda ki official Python 3.9 base image
FROM public.ecr.aws/lambda/python:3.9

# Requirements copy karna
COPY requirements.txt ${LAMBDA_TASK_ROOT}

# Dependencies install karna (boto3, Pillow, PyMuPDF)
RUN pip install --no-cache-dir -r requirements.txt

# Hamara logic /src folder se copy karna
COPY src/ ${LAMBDA_TASK_ROOT}

# Lambda handler function ko point karna (file_name.function_name)
CMD [ "handler.handler" ]