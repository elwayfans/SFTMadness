from fastapi import APIRouter, Request, HTTPException, Header, Body
import boto3
import os
import jwt
import requests
import json
from jwt import algorithms
from botocore.exceptions import ClientError
from src.validate import validate_token

router = APIRouter()


@router.post("/logout")
async def logout_user(
    request: Request,
    body: dict = Body(...),
    x_test_mode: str = Header(default="false"),
):
    """
    Logout the user globally from Cognito, or fake it in test mode.
    """
    test_mode = x_test_mode.lower() == "true"

    # Read the Authorization token from headers
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header.replace("Bearer ", "").strip()

    if test_mode:
        # Fake logout response
        return {
            "message": "Logout successful (TEST MODE)",
            "status": "success"
        }

    try:
        id_token_payload = validate_token(token)
        email = id_token_payload.get('email')

        if not email:
            raise HTTPException(status_code=400, detail="Could not get email from token")

        # Perform real Cognito logout
        cognito_client = boto3.client('cognito-idp')
        cognito_client.admin_user_global_sign_out(
            UserPoolId=os.environ['COGNITO_USER_POOL_ID'],
            Username=email
        )

        return {
            "message": "Logout successful",
            "status": "success"
        }

    except cognito_client.exceptions.UserNotFoundException:
        raise HTTPException(status_code=404, detail="User not found in Cognito")
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Logout error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")
