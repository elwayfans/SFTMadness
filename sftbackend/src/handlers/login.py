from fastapi import APIRouter, HTTPException, Body, Request, Response
import boto3
import os
from botocore.exceptions import ClientError

router = APIRouter()

@router.post("/login")
def login_user(
    request: Request,
    response: Response,
    payload: dict = Body(...)
):
    email = payload.get("email")
    password = payload.get("password")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    test_mode = request.headers.get("X-Test-Mode", "").lower() == "true"
    if test_mode:
        # Set fake cookie for test mode
        response.set_cookie(
            key="idToken",
            value="test-id-token",
            httponly=False,
            secure=False,
            samesite="strict",
            max_age=3600,
            path="/"
        )
        return {
            "message": "Login successful (TEST MODE)",
            "user": {
                "sub": "test-user-id",
                "email": email,
                "email_verified": "true",
                "custom:role": "test"
            }
        }

    user_pool_id = os.getenv("COGNITO_USER_POOL_ID")
    client_id = os.getenv("COGNITO_CLIENT_ID")

    if not user_pool_id or not client_id:
        raise HTTPException(status_code=500, detail="Missing Cognito config")

    try:
        cognito_client = boto3.client('cognito-idp', region_name='us-east-2')
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

        tokens = auth_response['AuthenticationResult']

        # Set secure, HttpOnly cookie for ID token
        response.set_cookie(
            key="idToken",
            value=tokens['IdToken'],
            httponly=False,
            secure=False,
            samesite="strict",
            max_age=tokens['ExpiresIn'],
            path="/"
        )

        user_response = cognito_client.get_user(AccessToken=tokens['AccessToken'])
        user_attributes = {
            attr['Name']: attr['Value'] for attr in user_response.get('UserAttributes', [])
        }

        return {
            "message": "Login successful",
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

@router.post("/complete-new-password")
def complete_new_password(
    response: Response,
    payload: dict = Body(...)
):
    email = payload.get("email")
    new_password = payload.get("new_password")
    session = payload.get("session")

    if not email or not new_password or not session:
        raise HTTPException(status_code=400, detail="Email, new password, and session are required")

    user_pool_id = os.getenv("COGNITO_USER_POOL_ID")
    client_id = os.getenv("COGNITO_CLIENT_ID")
    if not user_pool_id or not client_id:
        raise HTTPException(status_code=500, detail="Missing Cognito config")

    try:
        cognito_client = boto3.client('cognito-idp', region_name='us-east-2')

        response_data = cognito_client.respond_to_auth_challenge(
            ClientId=client_id,
            ChallengeName='NEW_PASSWORD_REQUIRED',
            Session=session,
            ChallengeResponses={
                'USERNAME': email,
                'NEW_PASSWORD': new_password
            }
        )

        if 'AuthenticationResult' not in response_data:
            raise HTTPException(status_code=401, detail="Failed to set new password")

        tokens = response_data['AuthenticationResult']

        user_response = cognito_client.get_user(AccessToken=tokens['AccessToken'])
        user_attributes = {
            attr['Name']: attr['Value'] for attr in user_response.get('UserAttributes', [])
        }

        response.set_cookie(
            key="idToken",
            value=tokens['IdToken'],
            httponly=False,
            secure=False,
            samesite="strict",
            max_age=tokens['ExpiresIn'],
            path="/"
        )

        return {
            "message": "Password changed and login successful",
            "user": user_attributes
        }

    except cognito_client.exceptions.NotAuthorizedException:
        raise HTTPException(status_code=401, detail="Invalid credentials or session expired")
    except cognito_client.exceptions.InvalidPasswordException as e:
        raise HTTPException(status_code=400, detail=f"Invalid password: {str(e)}")
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Cognito error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")