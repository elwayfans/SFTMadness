FROM python:3.10

WORKDIR /app

# Cache dependencies
COPY requirements.txt .

# Install dependencies
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

# Build indexes and run AI
CMD ["bash", "run_ai.sh"]