FROM public.ecr.aws/lambda/python:3.12

WORKDIR /var/task

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["email.app.lambda_handler"]
