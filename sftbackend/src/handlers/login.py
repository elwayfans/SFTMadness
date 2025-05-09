from fastapi import APIRouter, HTTPException, Body, Request
import boto3
import os
from botocore.exceptions import ClientError

router = APIRouter()

@router.post("/login")
def login_user(
    request: Request,
    payload: dict = Body(...)
):
    """
    Login with Cognito or return fake login if X-Test-Mode: true is passed in headers.
    """
    email = payload.get("email")
    password = payload.get("password")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    # Check for test mode
    test_mode = request.headers.get("X-Test-Mode", "").lower() == "true"
    if test_mode:
        # Fake tokens for testing
        return {
            "message": "Login successful (TEST MODE)",
            "tokens": {
                "accessToken": "test-access-token",
                "idToken": "test-id-token",
                "refreshToken": "test-refresh-token",
                "expiresIn": 3600
            },
            "user": {
                "sub": "test-user-id",
                "email": email,
                "email_verified": "true",
                "custom:role": "test"
            }
        }

    # Production Cognito login
    user_pool_id = os.getenv("COGNITO_USER_POOL_ID")
    client_id = os.getenv("COGNITO_CLIENT_ID")

    if not user_pool_id or not client_id:
        raise HTTPException(status_code=500, detail="Missing Cognito config")

    try:
        cognito_client = boto3.client('cognito-idp')
        auth_response = cognito_client.initiate_auth(
            ClientId=client_id,
            AuthFlow='USER_PASSWORD_AUTH',
            AuthParameters={
                'USERNAME': email,
                'PASSWORD': password
            }
        )

        if 'AuthenticationResult' not in auth_response:
            challenge = auth_response.get('ChallengeName')
            if challenge == 'NEW_PASSWORD_REQUIRED':
                return {
                    "message": "Password change required",
                    "challenge": challenge,
                    "session": auth_response.get("Session")
                }
            raise HTTPException(status_code=401, detail=f"Authentication failed: {challenge or 'Unknown challenge'}")

        tokens = {
            'accessToken': auth_response['AuthenticationResult']['AccessToken'],
            'idToken': auth_response['AuthenticationResult']['IdToken'],
            'refreshToken': auth_response['AuthenticationResult']['RefreshToken'],
            'expiresIn': auth_response['AuthenticationResult']['ExpiresIn']
        }

        user_response = cognito_client.get_user(AccessToken=tokens['accessToken'])
        user_attributes = {
            attr['Name']: attr['Value'] for attr in user_response.get('UserAttributes', [])
        }

        return {
            "message": "Login successful",
            "tokens": tokens,
            "user": user_attributes
        }

    except cognito_client.exceptions.NotAuthorizedException:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    except cognito_client.exceptions.UserNotConfirmedException:
        raise HTTPException(status_code=403, detail="User is not confirmed")
    except cognito_client.exceptions.UserNotFoundException:
        raise HTTPException(status_code=401, detail="User not found")
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Cognito error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
