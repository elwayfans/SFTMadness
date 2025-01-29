import json
import boto3
import os
from botocore.exceptions import ClientError

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

def login_handler(event, context):
    if event['httpMethod'] == 'OPTIONS':
        return cors_response(200, "ok")
    
    try:
        # Parse request body
        try:
            body = json.loads(event.get('body', {}))
        except json.JSONDecodeError as e:
            return cors_response(400, f"Invalid JSON: {str(e)}")

        email = body.get('email')
        password = body.get('password')

        if not email or not password:
            return cors_response(400, "Email and password are required")

        # Initialize Cognito client
        cognito_client = boto3.client('cognito-idp')

        try:
            # Attempt authentication
            auth_response = cognito_client.initiate_auth(
                ClientId=os.environ['COGNITO_CLIENT_ID'],
                AuthFlow='USER_PASSWORD_AUTH',
                AuthParameters={
                    'USERNAME': email,
                    'PASSWORD': password
                }
            )

            # Get user details
            user_response = cognito_client.get_user(
                AccessToken=auth_response['AuthenticationResult']['AccessToken']
            )

            # Extract tokens from response
            tokens = {
                'accessToken': auth_response['AuthenticationResult']['AccessToken'],
                'idToken': auth_response['AuthenticationResult']['IdToken'],
                'refreshToken': auth_response['AuthenticationResult']['RefreshToken'],
                'expiresIn': auth_response['AuthenticationResult']['ExpiresIn']
            }

            # Extract user attributes
            user_attributes = {}
            for attr in user_response['UserAttributes']:
                user_attributes[attr['Name']] = attr['Value']

            return cors_response(200, {
                "message": "Login successful",
                "tokens": tokens,
                "user": user_attributes
            })

        except cognito_client.exceptions.NotAuthorizedException:
            return cors_response(401, "Invalid username or password")
        except cognito_client.exceptions.UserNotConfirmedException:
            return cors_response(403, "User is not confirmed")
        except cognito_client.exceptions.UserNotFoundException:
            return cors_response(404, "User not found")
        except ClientError as e:
            return cors_response(500, f"Authentication error: {str(e)}")

    except Exception as e:
        return cors_response(500, f"Internal server error: {str(e)}")