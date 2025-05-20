#!/bin/bash

COMPANY_DIR="/app/shared_data"

echo "Starting index generation for all companies..."

for COMPANY_PATH in "$COMPANY_DIR"/*; do

    [ -d "$COMPANY_PATH" ] || continue

    COMPANY=$(basename "$COMPANY_PATH")
    echo "Building index for company: $COMPANY"
    
    python embed_index.py --company "$COMPANY"
    
    sleep 5
done

echo "All indexes built. Starting chatbot API server..."
uvicorn chatbot:app --host 0.0.0.0 --port 8001
