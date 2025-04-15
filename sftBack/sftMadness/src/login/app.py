import json
import base64
import boto3
import os
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()

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

import os
import json
import base64
import boto3
from botocore.exceptions import ClientError

def cors_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
            "Content-Type": "application/json"
        },
        "body": json.dumps(body)
    }

def login_handler(event, context):
    user_pool_id = os.getenv("COGNITO_USER_POOL_ID")
    client_id = os.getenv("COGNITO_CLIENT_ID")

    if not user_pool_id or not client_id:
        return cors_response(500, "Missing Cognito configuration")

    print("ENVIRONMENT VARIABLES:")
    print(json.dumps(dict(os.environ), indent=2))

    print("FULL EVENT:")
    print(json.dumps(event, indent=2))

    if event.get('httpMethod') == 'OPTIONS':
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

        email = body.get("email")
        password = body.get("password")

        if not email or not password:
            return cors_response(400, "Email and password are required")

        cognito_client = boto3.client('cognito-idp')

        try:
            auth_response = cognito_client.initiate_auth(
                ClientId=client_id,
                AuthFlow='USER_PASSWORD_AUTH',
                AuthParameters={
                    'USERNAME': email,
                    'PASSWORD': password
                }
            )

            print("AUTH RESPONSE:")
            print(json.dumps(auth_response, indent=2, default=str))

            # Handle NEW_PASSWORD_REQUIRED challenge
            if 'AuthenticationResult' not in auth_response:
                challenge = auth_response.get('ChallengeName')

                if challenge == 'NEW_PASSWORD_REQUIRED':
                    return cors_response(403, {
                        "message": "Password change required",
                        "challenge": "NEW_PASSWORD_REQUIRED",
                        "session": auth_response.get("Session")
                    })

                return cors_response(401, f"Authentication failed: {challenge or 'No AuthenticationResult returned'}")

            # Auth success
            access_token = auth_response['AuthenticationResult']['AccessToken']

            user_response = cognito_client.get_user(
                AccessToken=access_token
            )

            tokens = {
                'accessToken': access_token,
                'idToken': auth_response['AuthenticationResult']['IdToken'],
                'refreshToken': auth_response['AuthenticationResult']['RefreshToken'],
                'expiresIn': auth_response['AuthenticationResult']['ExpiresIn']
            }

            user_attributes = {
                attr['Name']: attr['Value'] for attr in user_response['UserAttributes']
            }

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

    except json.JSONDecodeError as e:
        return cors_response(400, f"Invalid JSON: {str(e)}")
    except Exception as e:
        return cors_response(500, f"Internal server error: {str(e)}")
