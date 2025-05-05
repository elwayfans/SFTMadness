import os
import json
import boto3
import requests
import jwt
from jwt import algorithms


def cors_response(status_code, body, content_type="application/json"):
    headers = {
        'Content-Type': content_type,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE',
    }
    return {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps({"message": body}) if isinstance(body, str) else json.dumps(body)
    }

def validate_token(event):
    try:
        auth_header = event.get('headers', {}).get('Authorization')
        if not auth_header:
            return cors_response(401, "No authorization token provided"), None
        if not auth_header.startswith('Bearer '):
            return cors_response(401, "Invalid Authorization header format. Must start with 'Bearer '"), None
        
        token = auth_header.replace('Bearer ', '').strip()
        try:
            token_payload = verify_token(token)
            print(f"Token verified successfully: {json.dumps(token_payload)}")
            return None, token_payload
        except Exception as e:
            print(f"Token verification failed: {str(e)}")
            return cors_response(401, f"Authentication failed: {str(e)}"), None
    except Exception as e:
        return cors_response(401, "Authentication failed"), None

def verify_token(token):
    print("Verifying token:")
    try:
        region = boto3.session.Session().region_name

        headers = jwt.get_unverified_header(token)
        kid = headers['kid']

        url = f'https://cognito-idp.{region}.amazonaws.com/{os.environ["COGNITO_USER_POOL_ID"]}/.well-known/jwks.json'
        response = requests.get(url)
        response.raise_for_status()
        keys = response.json()['keys']

        public_key = None
        for key in keys:
            if key['kid'] == kid:
                public_key = algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
                break

        if not public_key:
            raise Exception('Public key not found')

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
