FROM public.ecr.aws/lambda/nodejs:18

COPY package*.json ${LAMBDA_TASK_ROOT}/

RUN npm install --omit=dev

COPY src/ ${LAMBDA_TASK_ROOT}/

CMD [ "index.handler" ]