import json
import base64
import os
import hmac
import jwt
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

# Initialize MongoDB client outside the handler for connection reuse
uri = os.getenv("MONGODB_URI")
client = MongoClient(uri, server_api=ServerApi('1'))
db = client["SFTMadnessUserData"]
collection = db["SFTMadnessUserData"]

def cors_response(status_code, body, content_type="application/json"):
    headers = {
        'Content-Type': content_type,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*',
    }

    if content_type == "application/json" and not isinstance(body, str):
        body = json.dumps(body, default=str)

    return {
        'statusCode': status_code,
        'body': body,
        'headers': headers,
    }

def lambda_handler(event, context):
    if event.get('httpMethod') == 'OPTIONS':
        return cors_response(200, "ok")

    shared_secret = os.getenv("SHARED_SECRET")

    headers = event.get("headers", {})
    if not hmac.compare_digest(headers.get("X-Shared-Secret", ""), shared_secret):
        return cors_response(403, {"error": "Unauthorized access"})

    method = event.get("httpMethod")
    raw_body = event.get("body")

    if raw_body:
        if event.get("isBase64Encoded", False):
            decoded = base64.b64decode(raw_body).decode("utf-8")
            body = json.loads(decoded)
        else:
            body = json.loads(raw_body)
    else:
        body = {}

    # Get and decode the Authorization token
    auth_header = headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return cors_response(401, {"error": "Missing or invalid Authorization header"})

    token = auth_header.split(" ")[1]
    decoded_token = jwt.decode(token, options={"verify_signature": False})  # WARNING: No signature verification here!
    user_sub = decoded_token.get("sub")

    if not user_sub:
        return cors_response(400, {"error": "Invalid token: no sub found"})

    if method == "POST":
        # Validate that request body has 'sub' and 'url'
        body_sub = body.get("sub")
        body_url = body.get("url")

        if not body_sub or not body_url:
            return cors_response(400, {"error": "Request must include 'sub' and 'url'"})

        # Ensure the sub in the body matches the user's sub from token
        if body_sub != user_sub:
            return cors_response(403, {"error": "You can only modify your own data"})

        # Check if user already exists
        existing_item = collection.find_one({"sub": user_sub})

        # Prepare the item to insert or update
        item = {
            "sub": user_sub,
            "url": body_url,
        }

        # Update or create
        if existing_item:
            collection.update_one({"sub": user_sub}, {"$set": item})
            return cors_response(200, {"message": "Data updated successfully"})
        else:
            collection.insert_one(item)
            return cors_response(201, {"message": "Data created successfully"})

    elif method == "GET":
        items = list(collection.find({}, {"_id": 0}))
        return cors_response(200, {"data": items})

    elif method == "DELETE":
        if "sub" not in body:
            return cors_response(400, {"error": "Missing 'sub' key"})
        if body["sub"] != user_sub:
            return cors_response(403, {"error": "You can only delete your own data"})

        result = collection.delete_one({"sub": user_sub})
        if result.deleted_count == 0:
            return cors_response(404, {"error": "Data not found"})
        return cors_response(200, {"message": "Data deleted successfully"})

    return cors_response(405, {"error": "Method not allowed"})
