import json
import base64
import boto3
import os
import requests
import jwt
from jwt import algorithms
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

def verify_token(token, token_type="id"):
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

    try:
        # Verify the token
        payload = jwt.decode(
            token,
            public_key,
            algorithms=['RS256'],
            audience=os.environ['COGNITO_CLIENT_ID']
        )

        return payload
    except jwt.ExpiredSignatureError:
        raise Exception('Token has expired')
    except jwt.InvalidTokenError:
        raise Exception('Invalid token')

def logout_handler(event, context):
    print("FULL EVENT:")
    print(json.dumps(event, indent=2))

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

        print("Parsed body:", json.dumps(body, indent=2))

        # Get the Authorization header
        auth_header = body.get('headers', {}).get('Authorization')
        if not auth_header:
            return cors_response(401, "No authorization token provided")

        if not auth_header.startswith('Bearer '):
            return cors_response(401, "Invalid authorization header format. Must start with 'Bearer '")

        id_token = auth_header.replace('Bearer ', '').strip()

        try:
            id_token_payload = verify_token(id_token, "id")

            email = id_token_payload.get('email')
            if not email:
                return cors_response(400, "Could not get email from token")

            # Sign out globally from Cognito
            cognito_client = boto3.client('cognito-idp')
            cognito_client.admin_user_global_sign_out(
                UserPoolId=os.environ['COGNITO_USER_POOL_ID'],
                Username=email
            )

            return cors_response(200, {
                "message": "Logout successful",
                "status": "success"
            })

        except cognito_client.exceptions.UserNotFoundException:
            return cors_response(404, "User not found in Cognito")
        except ClientError as e:
            return cors_response(500, f"Logout error: {str(e)}")
        except Exception as e:
            print("Token verification error:", str(e))
            return cors_response(401, f"Invalid token: {str(e)}")

    except Exception as e:
        print("General error:", str(e))
        return cors_response(500, f"Internal server error: {str(e)}")
