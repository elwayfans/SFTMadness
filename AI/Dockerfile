FROM python:3.10
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy code and company data
COPY . .

# Build index, then run chatbot
CMD ["bash", "run_ai.sh"]
