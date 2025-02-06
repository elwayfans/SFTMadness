import json
import boto3
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

def logout_handler(event, context):
    if event['httpMethod'] == 'OPTIONS':
        return cors_response(200, "ok")
    
    try:
        # Get the access token from Authorization header
        auth_header = event.get('headers', {}).get('Authorization')
        if not auth_header:
            return cors_response(401, "No authorization token provided")

        token = auth_header.split(' ')[-1]

        # Initialize Cognito client
        cognito_client = boto3.client('cognito-idp')

        try:
            # Global sign out from all devices
            cognito_client.global_sign_out(
                AccessToken=token
            )

            return cors_response(200, {
                "message": "Logout successful",
                "status": "success"
            })

        except cognito_client.exceptions.NotAuthorizedException:
            return cors_response(401, "Invalid or expired token")
        except ClientError as e:
            return cors_response(500, f"Logout error: {str(e)}")

    except Exception as e:
        return cors_response(500, f"Internal server error: {str(e)}")