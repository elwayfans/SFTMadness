import json
import requests
import os
import base64
import boto3
import jwt
from datetime import datetime, date
from botocore.exceptions import ClientError
from jwt import algorithms

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
    
        # Authenticate the request
    
        auth_header = event.get('headers', {}).get('Authorization')
        if not auth_header:
            return cors_response(401, "No authorization token provided")
        if not auth_header.startswith('Bearer '):
            return cors_response(401, "Invalid Authorization header format. Must start with 'Bearer '")
        token = auth_header.replace('Bearer ', '').strip()
        try:
            token_payload = verify_token(token)
            print(f"Token verified successfully: {json.dumps(token_payload)}")
        except Exception as e:
            print(f"Token verification failed: {str(e)}")
            return cors_response(401, f"Authentication failed: {str(e)}")

    except Exception as e:
        return cors_response(401, "Authentication failed")
        
    # Routes with authentication
    try:
        if resource_path == '/users/{userId}' and http_method == 'GET':
            return getUser(event, context)
        elif resource_path == '/users/{userId}' and http_method == 'PUT':
            return updateUser(event, context)
        elif resource_path == '/users/{userId}' and http_method == 'DELETE':
            return deleteUser(event, context)
        elif resource_path == '/users/byEmail' and http_method == 'POST':
            return getUserByEmail(body)
        else:
            return cors_response(404, "Not Found")
        
    except Exception as e:
        return cors_response(500, str(e))

# Verify JWT token
def verify_token(token):
    print("Verifying token:")
    try:
        region = boto3.session.Session().region_name

        # Get the JWT kid (key ID)
        headers = jwt.get_unverified_header(token)
        kid = headers['kid']

        # Get the public keys from Cognito
        url = f'https://cognito-idp.{region}.amazonaws.com/{os.environ["COGNITO_USER_POOL_ID"]}/.well-known/jwks.json'
        response = requests.get(url)
        response.raise_for_status()
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
        payload = jwt.decode(
            token,
            public_key,
            algorithms=['RS256'],
            options={
                'verify_signature': True,
                'verify_exp': True,
                'verify_aud': True,
                'verify_iss': True
            },
            audience=os.environ['COGNITO_CLIENT_ID'],
            issuer=f'https://cognito-idp.{region}.amazonaws.com/{os.environ["COGNITO_USER_POOL_ID"]}'
        )
        return payload

    except Exception as e:
        print(f"Token verification failed: {str(e)}")
        raise

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

def getUser(event, context):
    cognito_client = boto3.client('cognito-idp')
    user_id = event['pathParameters'].get('userId')

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
    user_id = event['pathParameters'].get('userId')
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

def deleteUser(event, context):
    cognito_client = boto3.client('cognito-idp')
    user_id = event['pathParameters'].get('userId')

    if not user_id:
        return cors_response(400, "User ID is required")

    try:
        cognito_client.admin_delete_user(
            UserPoolId=os.environ['COGNITO_USER_POOL_ID'],
            Username=user_id
        )
        return cors_response(200, {"message": "User deleted successfully"})
    except ClientError as e:
        return cors_response(500, {"error": f"Error deleting user: {str(e)}"})

# def resetUserPassword(event, body):
#     print("Starting resetUserPassword function")
#     cognito_client = boto3.client('cognito-idp')

#     # Auth header and manual token verification
#     auth_header = event.get('headers', {}).get('Authorization')
#     if not auth_header:
#         return cors_response(401, "No authorization token provided")
#     if not auth_header.startswith('Bearer '):
#         return cors_response(401, "Invalid Authorization header format. Must start with 'Bearer '")
    
#     token = auth_header.replace('Bearer ', '').strip()
#     try:
#         token_payload = verify_token(token)
#         print(f"Token verified successfully: {json.dumps(token_payload)}")
#     except Exception as e:
#         print(f"Token verification failed: {str(e)}")
#         return cors_response(401, f"Authentication failed: {str(e)}")

#     # Get sub from manually verified token
#     requester_sub = token_payload.get('sub')
#     print(f"Requester sub from token: {requester_sub}")

#     requested_user_id = event['pathParameters'].get('userId')
#     print(f"Requested userId: {requested_user_id}")

#     if not requested_user_id:
#         print("No userId provided in pathParameters")
#         return cors_response(400, {"error": "User ID is required"})

#     try:
#         print(f"Fetching user from Cognito: {requested_user_id}")
#         user_data = cognito_client.admin_get_user(
#             UserPoolId=os.environ['COGNITO_USER_POOL_ID'],
#             Username=requested_user_id
#         )
#         print(f"User data retrieved: {user_data}")

#         target_user_sub = next(
#             (attr['Value'] for attr in user_data['UserAttributes'] if attr['Name'] == 'sub'),
#             None
#         )
#         print(f"Target user sub: {target_user_sub}")

#         if not target_user_sub:
#             print("Target user's sub not found in attributes")
#             return cors_response(400, {"error": "Target user 'sub' attribute not found"})

#         if requester_sub != target_user_sub:
#             print("Sub mismatch: requester is not the same as target user")
#             return cors_response(403, {"error": "Unauthorized: You can only reset your own password"})

#         print("Sub match confirmed. Sending password reset email.")
#         cognito_client.admin_reset_user_password(
#             UserPoolId=os.environ['COGNITO_USER_POOL_ID'],
#             Username=requested_user_id
#         )

#         print("Password reset email sent successfully")
#         return cors_response(200, {"message": "Password reset email has been sent"})

#     except ClientError as e:
#         print(f"Error during password reset process: {str(e)}")
#         return cors_response(500, {"error": f"Error processing request: {str(e)}"})


def initiateForgotPassword(event, body):
    cognito_client = boto3.client('cognito-idp')
    
    username = body.get("username")
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
    
    username = body.get("username")
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
        return cors_response(200, {"user": users[0]})
    except ClientError as e:
        return cors_response(500, {"error": f"Error retrieving user: {str(e)}"})