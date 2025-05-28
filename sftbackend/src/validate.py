import os
import json
import boto3
import jwt
from jwt import algorithms
from fastapi import HTTPException, Request
import requests

def verify_token(token: str):
    """
    Verifies the token using Cognito's public keys.
    """
    try:
        region = os.environ['AWS_REGION']
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
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")


def require_admin(decoded_token):
    """
    Ensures the user is in the 'SFTAdmins' group.
    """
    groups = decoded_token.get('cognito:groups', [])
    if 'SFTAdmins' not in groups:
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required")


# Validate token from HttpOnly cookie
def validate_token(request: Request):
    """
    Dependency to check if the request has a valid token from HttpOnly cookie.
    """
    token = request.cookies.get('idToken')
    if not token:
        raise HTTPException(status_code=401, detail="No auth token cookie provided")
    
    return verify_token(token)
