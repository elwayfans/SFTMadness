import json
import os
import psycopg2
from datetime import datetime, date
import boto3
import base64
import jwt
from botocore.exceptions import ClientError
from psycopg2.extras import RealDictCursor
import requests
from jwt import algorithms
import uuid
import re
from bs4 import BeautifulSoup
from tokenValidation.validate import validate_token
from urllib.parse import urlparse, urljoin
from collections import deque

# S3 init (unused here but included per original structure)
s3 = boto3.client('s3')
BUCKET_NAME = os.environ.get('S3_SCRAPED_BUCKET_NAME')

# CORS helper
def cors_response(status_code, body, content_type="application/json"):
    headers = {
        'Content-Type': content_type,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE',
    }

    if content_type == "application/json":
        body = json.dumps(body, default=str)

    return {
        'statusCode': status_code,
        'body': body,
        'headers': headers,
    }

# Lambda entry point
def lambda_handler(event, context):
    if event['httpMethod'] == 'OPTIONS':
        return cors_response(200, "ok")

    raw_body = event.get("body")
    if not raw_body:
        return cors_response(400, "Missing request body")

    if event.get("isBase64Encoded", False):
        decoded = base64.b64decode(raw_body).decode("utf-8")
        body = json.loads(decoded)
    else:
        body = json.loads(raw_body)

    http_method = event['httpMethod']
    resource_path = event['resource']

    try:
        auth_header = event.get('headers', {}).get('Authorization')
        if not auth_header:
            return cors_response(401, "Unauthorized")

        token = auth_header.split(' ')[-1]
        validate_token(token)

    except Exception as e:
        return cors_response(401, "Authentication failed")

    try:
        if resource_path == '/scrapeCollegeData' and http_method == 'POST':
            return scrape_college_data(event, body)
        else:
            return cors_response(404, "Not Found")
    except Exception as e:
        return cors_response(500, {"error": str(e)})

# Crawler and dollar extraction logic
def scrape_college_data(event, body):
    try:
        start_url = body.get('url')
        pages = body.get('pages', 10)
        if not start_url or not start_url.startswith('http'):
            return cors_response(400, {"error": "Invalid or missing URL"})

        max_pages = pages
        visited = set()
        queue = deque([start_url])
        amount_results = []

        domain = urlparse(start_url).netloc
        headers = {'User-Agent': 'Mozilla/5.0'}

        while queue and len(visited) < max_pages:
            url = queue.popleft()
            if url in visited:
                continue
            visited.add(url)

            try:
                res = requests.get(url, headers=headers, timeout=10)
                if res.status_code != 200:
                    continue

                soup = BeautifulSoup(res.text, 'html.parser')
                text = soup.get_text(separator=' ', strip=True)

                # Match $ amounts
                dollar_matches = list(re.finditer(r'\$[0-9,]+(?:\.\d{2})?', text))

                for match in dollar_matches:
                    amount = match.group()
                    start_idx = max(int(match.start()) - 50, 0)
                    end_idx = min(int(match.end()) + 50, len(text))
                    context = str(text[start_idx:end_idx])

                    amount_results.append({
                        "url": url,
                        "amount": amount,
                        "context": context.strip()
                    })

                # Collect and prioritize internal links
                internal_links = []
                for link in soup.find_all('a', href=True):
                    href = link['href']
                    joined_url = urljoin(url, href)
                    parsed = urlparse(joined_url)
                    if parsed.netloc == domain and joined_url not in visited:
                        internal_links.append(joined_url)

                # Prioritize links with tuition-related keywords
                priority_keywords = ['tuition', 'cost', 'fee', 'financial-aid']
                def link_priority(link):
                    link_lower = link.lower()
                    for i, keyword in enumerate(priority_keywords):
                        if keyword in link_lower:
                            return i
                    return len(priority_keywords)

                prioritized_links = sorted(internal_links, key=link_priority)
                for link in prioritized_links:
                    queue.append(link)

            except Exception:
                continue  # Skip on error

        return cors_response(200, {
            "startUrl": start_url,
            "pagesScanned": len(visited),
            "dollarAmountsFound": amount_results,
            "timestamp": datetime.utcnow().isoformat()
        })

    except Exception as e:
        return cors_response(500, {"error": str(e)})
