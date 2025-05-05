import base64
import json
import os
import psycopg2
from datetime import datetime, date
import boto3
import jwt
from botocore.exceptions import ClientError
from psycopg2.extras import RealDictCursor
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from tokenValidation.validate import validate_token
from urllib.parse import parse_qs

# MongoDB client
uri = os.getenv("MONGODB_URI")
client = MongoClient(uri, server_api=ServerApi('1'))
db = client["AICustoms"]
collection = db["AI_Organization_Customs"]

##########################
# Constants & Field Rules
REQUIRED_FIELDS = [
    'modelName', 'modelLogo', 'introduction', 'friendliness', 'formality',
    'accent', 'verbosity', 'humor', 'technicalLevel',
    'preferredGreeting', 'signatureClosing', 'instructions'
]

RANGED_FIELDS = ['friendliness', 'formality', 'verbosity', 'humor', 'technicalLevel']

##########################
# Main Lambda Entry

def lambda_handler(event, context):
    if event['httpMethod'] == 'OPTIONS':
        return cors_response(200, "ok")

    http_method = event['httpMethod']
    resource_path = event['resource']

    # Authentication
    try:
        auth_header = event.get('headers', {}).get('Authorization')
        if not auth_header or not auth_header.startswith("Bearer "):
            return cors_response(401, {"error": "Unauthorized"})

        token = auth_header.split(" ")[1]
        decoded_token = validate_token(token)
        user_sub = decoded_token.get("sub")
        if not user_sub:
            return cors_response(400, {"error": "Invalid token: no sub found"})
    except Exception:
        return cors_response(401, {"error": "Authentication failed"})

    try:
        if resource_path == '/customs':
            if http_method == 'POST':
                return set_customs(event, user_sub)
            elif http_method == 'GET':
                return get_customs(user_sub)
            elif http_method == 'PUT':
                return update_customs(event, user_sub)
            elif http_method == 'DELETE':
                return delete_customs(user_sub)
            else:
                return cors_response(405, {"error": "Method Not Allowed"})
        else:
            return cors_response(404, {"error": "Not Found"})
    except Exception as e:
        return cors_response(500, {"error": str(e)})

##########################
# Utilities

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

def parse_body(event):
    raw_body = event.get("body")
    if not raw_body:
        return {}

    if event.get("isBase64Encoded", False):
        raw_body = base64.b64decode(raw_body).decode("utf-8")

    content_type = event.get("headers", {}).get("Content-Type", "")
    
    if "application/json" in content_type:
        return json.loads(raw_body)
    elif "application/x-www-form-urlencoded" in content_type:
        parsed = parse_qs(raw_body)
        return {k: v[0] for k, v in parsed.items()}
    else:
        raise ValueError("Unsupported content type")

def validate_fields(body):
    missing = [field for field in REQUIRED_FIELDS if field not in body]
    if missing:
        return f"Missing required fields: {', '.join(missing)}"

    for field in RANGED_FIELDS:
        try:
            value = int(body[field])
            if not (0 <= value <= 100):
                return f"{field.capitalize()} must be between 0 and 100"
        except (ValueError, TypeError):
            return f"{field.capitalize()} must be an integer between 0 and 100"

    return None

##########################
# Route Handlers

def set_customs(event, user_sub):
    body = parse_body(event)

    validation_error = validate_fields(body)
    if validation_error:
        return cors_response(400, {"error": validation_error})

    item = {
        "sub": user_sub,
        **{field: body[field] for field in REQUIRED_FIELDS}
    }

    existing = collection.find_one({"sub": user_sub})
    if existing:
        collection.update_one({"sub": user_sub}, {"$set": item})
        return cors_response(200, {"message": "Data updated successfully"})
    else:
        collection.insert_one(item)
        return cors_response(201, {"message": "Data created successfully"})

def get_customs(user_sub):
    result = collection.find_one({"sub": user_sub}, {"_id": 0})
    if not result:
        return cors_response(404, {"error": "No data found"})
    return cors_response(200, {"data": result})

def update_customs(event, user_sub):
    body = parse_body(event)
    if not body:
        return cors_response(400, {"error": "No data provided"})

    validation_error = validate_fields(body)
    if validation_error:
        return cors_response(400, {"error": validation_error})

    update_fields = {field: body[field] for field in REQUIRED_FIELDS}
    result = collection.update_one({"sub": user_sub}, {"$set": update_fields})

    if result.matched_count == 0:
        return cors_response(404, {"error": "Data not found"})

    return cors_response(200, {"message": "Data updated successfully"})

def delete_customs(user_sub):
    result = collection.delete_one({"sub": user_sub})
    if result.deleted_count == 0:
        return cors_response(404, {"error": "Data not found"})
    return cors_response(200, {"message": "Data deleted successfully"})
