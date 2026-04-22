FROM public.ecr.aws/lambda/python:3.10

RUN yum -y install ghostscript && yum clean all

COPY requirements.txt ${LAMBDA_TASK_ROOT}
RUN pip install -r requirements.txt

COPY src/ ${LAMBDA_TASK_ROOT}/

CMD [ "handler.handler" ]