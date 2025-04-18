import json
import os
import base64
import boto3
import jwt
from datetime import datetime, date
import requests
from botocore.exceptions import ClientError
from jwt import algorithms

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

def lambda_handler(event, context):
    if event['httpMethod'] == 'OPTIONS':
        return cors_response(200, "ok")
    
    try:
        # Decode Base64 body if necessary
        raw_body = event.get("body")
        if not raw_body:
            return cors_response(400, "Missing request body")

        if event.get("isBase64Encoded", False):
            decoded_body = base64.b64decode(raw_body).decode("utf-8")
            body = json.loads(decoded_body)
        else:
            body = json.loads(raw_body)

        print("Parsed body:", json.dumps(body, indent=2))

        # Verify token
        auth_header = event.get('headers', {}).get('Authorization')
        if not auth_header:
            return cors_response(401, "Unauthorized")
        
        token = auth_header.split(' ')[-1]
        verify_token(token)

    except Exception as e:
        return cors_response(401, "Authentication failed")
        
    # Routes with authentication
    try:
        resource_path = event['resource']
        http_method = event['httpMethod']

        if resource_path == '/admins' and http_method == 'POST':
            return createAdmin(body)
        elif resource_path == '/admins' and http_method == 'PUT':
            return updateUserRole(body)
        elif resource_path == '/admins/{userId}' and http_method == 'DELETE':
            return deleteUser(event)
        else:
            return cors_response(404, "Not Found")
        
    except Exception as e:
        return cors_response(500, str(e))

# Verify JWT token
def verify_token(token):
    if not token:
        raise Exception('No token provided')

    region = boto3.session.Session().region_name
    
    # Get the JWT kid (key ID)
    headers = jwt.get_unverified_header(token)
    kid = headers['kid']

    # Get the public keys from Cognito
    url = f'https://cognito-idp.{region}.amazonaws.com/{os.environ["COGNITO_USER_POOL_ID"]}/.well-known/jwks.json'
    response = requests.get(url)
    keys = response.json()['keys']

    # Find the correct public key
    public_key = None
    for key in keys:
        if key['kid'] == kid:
            public_key = algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
            break

    if not public_key:
        raise Exception('Public key not found')

    # Verify the token
    try:
        payload = jwt.decode(
            token,
            public_key,
            algorithms=['RS256'],
            audience=os.environ['COGNITO_CLIENT_ID'],
            options={"verify_exp": True}
        )
        return payload
    
    except jwt.ExpiredSignatureError:
        raise Exception('Token has expired')
    except jwt.InvalidTokenError:
        raise Exception('Invalid token')

# Create admin user in Cognito
def createAdmin(body):
    cognito_client = boto3.client('cognito-idp')
    user_pool_id = os.environ['COGNITO_USER_POOL_ID']

    email = body.get('email')
    password = body.get('password')

    if not email or not password:
        return cors_response(400, "Email and password are required")

    try:
        cognito_response = cognito_client.admin_create_user(
            UserPoolId=user_pool_id,
            Username=email,
            UserAttributes=[
                {'Name': 'email', 'Value': email},
                {'Name': 'email_verified', 'Value': 'true'}
            ],
            TemporaryPassword=password,
            MessageAction='SUPPRESS'
        )

        cognito_client.admin_set_user_password(
            UserPoolId=user_pool_id,
            Username=email,
            Password=password,
            Permanent=True
        )

        return cors_response(201, {
            "message": "Admin created successfully",
            "cognitoUser": cognito_response['User']
        })

    except ClientError as e:
        return cors_response(500, {"error": f"Error creating admin: {str(e)}"})

# Update user role in Cognito
def updateUserRole(body):
    cognito_client = boto3.client('cognito-idp')
    user_pool_id = os.environ['COGNITO_USER_POOL_ID']

    email = body.get('email')
    new_role = body.get('role')

    if not email or not new_role:
        return cors_response(400, "Email and role are required")

    try:
        cognito_client.admin_update_user_attributes(
            UserPoolId=user_pool_id,
            Username=email,
            UserAttributes=[
                {'Name': 'custom:role', 'Value': new_role}
            ]
        )

        return cors_response(200, {"message": f"User role updated to {new_role}"})

    except ClientError as e:
        return cors_response(500, {"error": f"Error updating user role: {str(e)}"})

# Delete user from Cognito
def deleteUser(event):
    cognito_client = boto3.client('cognito-idp')
    user_pool_id = os.environ['COGNITO_USER_POOL_ID']

    user_id = event['pathParameters'].get('userId')
    if not user_id:
        return cors_response(400, "User ID is required")

    try:
        cognito_client.admin_delete_user(
            UserPoolId=user_pool_id,
            Username=user_id
        )

        return cors_response(200, {"message": "User deleted successfully"})

    except ClientError as e:
        return cors_response(500, {"error": f"Error deleting user: {str(e)}"})