# Use Python Alpine image
FROM python:3.12-alpine

# Install required system dependencies
RUN apk add --no-cache gcc musl-dev libffi-dev openssl-dev python3-dev postgresql-dev

# Set working directory
WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app source code
COPY src/ ./src

# Optional: clean pip cache to reduce image size
RUN rm -rf ~/.cache/pip

# Environment config
ENV PYTHONUNBUFFERED=1

# Run FastAPI with uvicorn
CMD ["uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
