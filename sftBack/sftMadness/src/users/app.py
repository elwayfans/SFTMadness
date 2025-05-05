import json
import requests
import os
import base64
import boto3
import jwt
from datetime import datetime, date
from botocore.exceptions import ClientError
from jwt import algorithms
import tokenValidation.validate

# cors_response function to return API Gateway response with CORS headers
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

# lambda_handler function to handle incoming API Gateway requests
def lambda_handler(event, context):
    if event['httpMethod'] == 'OPTIONS':
        return cors_response(200, "ok")

    try:
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

        # Routes without authentication
        if resource_path == '/users' and http_method == 'POST':
            return registerUser(event, body)
        elif resource_path == '/users/resetPassword' and http_method == 'POST':
            return initiateForgotPassword(event, body)
        elif resource_path == '/users/confirmResetPassword' and http_method == 'POST':
            return confirmForgotPassword(event, body)

        # Properly handle token validation result
        auth_error, token_payload = tokenValidation.validate.validate_token(event)
        if auth_error is not None:
            return auth_error

        print(f"Token verified successfully: {json.dumps(token_payload)}")

        # Routes with authentication
        if resource_path == '/users/search' and http_method == 'GET':
            return getUser(event, body)
        elif resource_path == '/users/update' and http_method == 'PUT':
            return updateUser(event, context)
        elif resource_path == '/users/delete' and http_method == 'DELETE':
            return deleteUser(event, body)
        elif resource_path == '/users/byEmail' and http_method == 'POST':
            return getUserByEmail(body)
        else:
            return cors_response(404, "Not Found")

    except Exception as e:
        return cors_response(500, {"error": str(e)})

# Verify JWT token

# User management functions using Cognito
def registerUser(event, body):
    print("Registering user")
    cognito_client = boto3.client('cognito-idp')
    print("cognito_client set")
    email = body.get('email')
    password = body.get('password')
    name = body.get('name')
    role = body.get('role')
    organization = body.get('organization')

    if not email or not password or not role:
        return cors_response(400, {"error": "Missing required fields: email, password, role"})

    attributes = [
    {'Name': 'email', 'Value': email},
    {'Name': 'email_verified', 'Value': 'true'},
    {'Name': 'name', 'Value': name},
    {'Name': 'custom:Role', 'Value': role},
]

    # Only add organization if it's not None
    if organization is not None:
            attributes.append({'Name': 'custom:Organization', 'Value': organization})

    try:
        cognito_client.admin_create_user(
            UserPoolId=os.environ['COGNITO_USER_POOL_ID'],
            Username=email,
            UserAttributes=attributes,
            TemporaryPassword=password,
        )
        cognito_client.admin_set_user_password(
            UserPoolId=os.environ['COGNITO_USER_POOL_ID'],
            Username=email,
            Password=password,
            Permanent=True
        )
        return cors_response(201, {"message": "User created successfully"})
    except ClientError as e:
        return cors_response(500, {"error": f"Error creating user: {str(e)}"})

def getUser(event, body):
    cognito_client = boto3.client('cognito-idp')
    user_id = body.get('userId')

    if not user_id:
        return cors_response(400, "User ID is required")

    try:
        user = cognito_client.admin_get_user(
            UserPoolId=os.environ['COGNITO_USER_POOL_ID'],
            Username=user_id
        )
        return cors_response(200, {"user": user})
    except ClientError as e:
        return cors_response(404, {"error": f"User not found: {str(e)}"})

def updateUser(event, context):
    cognito_client = boto3.client('cognito-idp')
    user_id = body.get('userId')
    body = json.loads(event.get('body', '{}'))

    if not user_id:
        return cors_response(400, "User ID is required")

    try:
        attributes = []
        if 'email' in body:
            attributes.append({'Name': 'email', 'Value': body['email']})
        if 'role' in body:
            attributes.append({'Name': 'custom:role', 'Value': body['role']})

        cognito_client.admin_update_user_attributes(
            UserPoolId=os.environ['COGNITO_USER_POOL_ID'],
            Username=user_id,
            UserAttributes=attributes
        )
        return cors_response(200, {"message": "User updated successfully"})
    except ClientError as e:
        return cors_response(500, {"error": f"Error updating user: {str(e)}"})


def deleteUser(event, body):
    cognito_client = boto3.client('cognito-idp')

    # Extract values from body
    user_id = body.get('userId')
    auth_header = body.get('Authorization')

    if not user_id or not auth_header:
        return cors_response(400, {"error": "Missing required fields: userId or Authorization"})

    # Extract the token from Authorization header
    token = auth_header.split(" ")[1] if " " in auth_header else auth_header

    try:
        # Decode token WITHOUT signature verification (not secure for prod)
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        requester_sub = decoded_token.get('sub')
    except Exception as e:
        return cors_response(401, {"error": f"Invalid token: {str(e)}"})

    # Make sure user is deleting themselves
    if user_id != requester_sub:
        return cors_response(403, {"error": "You are not authorized to delete this user"})

    try:
        cognito_client.admin_delete_user(
            UserPoolId=os.environ['COGNITO_USER_POOL_ID'],
            Username=user_id
        )
        return cors_response(200, {"message": "User deleted successfully"})
    except ClientError as e:
        return cors_response(500, {"error": f"Error deleting user: {str(e)}"})

def initiateForgotPassword(event, body):
    cognito_client = boto3.client('cognito-idp')
    
    username = body.get("email")
    if not username:
        return cors_response(400, {"error": "Username (email or username) is required"})

    try:
        print(f"Initiating forgot password for: {username}")
        cognito_client.forgot_password(
            ClientId=os.environ['COGNITO_CLIENT_ID'],
            Username=username
        )
        return cors_response(200, {"message": "Password reset code sent to email/SMS"})
    except ClientError as e:
        print(f"Error in forgot_password: {str(e)}")
        return cors_response(500, {"error": f"Error sending reset code: {str(e)}"})
    
def confirmForgotPassword(event, body):
    cognito_client = boto3.client('cognito-idp')
    
    username = body.get("email")
    code = body.get("code")
    new_password = body.get("newPassword")

    if not username or not code or not new_password:
        return cors_response(400, {"error": "Username, code, and new password are required"})

    try:
        print(f"Confirming password reset for: {username} with code: {code}")
        cognito_client.confirm_forgot_password(
            ClientId=os.environ['COGNITO_CLIENT_ID'],
            Username=username,
            ConfirmationCode=code,
            Password=new_password
        )
        return cors_response(200, {"message": "Password reset successfully"})
    except ClientError as e:
        print(f"Error in confirm_forgot_password: {str(e)}")
        return cors_response(500, {"error": f"Error confirming reset: {str(e)}"})

    
def getUserByEmail(body):
    cognito_client = boto3.client('cognito-idp')

    email = body.get('email')

    if not email:
        return cors_response(400, {"error": "Email is required"})

    try:
        response = cognito_client.list_users(
            UserPoolId=os.environ['COGNITO_USER_POOL_ID'],
            Filter=f'email = "{email}"'
        )
        users = response.get('Users', [])

        if not users:
            return cors_response(404, {"error": "User not found"})

        user = users[0]

        sub = next((attr['Value'] for attr in user['Attributes'] if attr['Name'] == 'sub'), None)

        if not sub:
            return cors_response(500, {"error": "User found but no sub attribute present"})

        return cors_response(200, {"sub": sub})

    except ClientError as e:
        return cors_response(500, {"error": f"Error retrieving user: {str(e)}"})