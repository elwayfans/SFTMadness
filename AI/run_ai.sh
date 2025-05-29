#!/bin/bash

COMPANY_DIR="/app/shared_data"

echo "Starting index generation for all companies..."

for COMPANY_PATH in "$COMPANY_DIR"/*; do
    [ -d "$COMPANY_PATH" ] || continue

    COMPANY=$(basename "$COMPANY_PATH")
    JSON_FILE="$COMPANY_PATH/college_knowledge.json"
    INDEX_FILE="$COMPANY_PATH/faiss.index"

    if [ -f "$JSON_FILE" ]; then

        if [ ! -f "$INDEX_FILE" ] || [ "$JSON_FILE" -nt "$INDEX_FILE" ]; then
            echo "Building index for company: $COMPANY"
            python embed_index.py --company "$COMPANY"
            sleep 5
        else
            echo "Index for company $COMPANY is up-to-date. Skipping..."
        fi
    else
        echo "Missing college_knowledge.json for $COMPANY. Skipping..."
    fi
done

echo "All indexes processed. Starting chatbot API server..."
uvicorn chatbot:app --host 0.0.0.0 --port 8001
