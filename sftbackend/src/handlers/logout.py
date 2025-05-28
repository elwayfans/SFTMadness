from fastapi import APIRouter, Request, HTTPException, Header, Body, Response
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
async def logout_user(request: Request, response: Response):
    # Extract token from cookie
    token = request.cookies.get("idToken")
    if not token:
        raise HTTPException(status_code=401, detail="No token found")
    if token:
        try:
            cognito_client = boto3.client("cognito-idp", region_name="us-east-2")
            cognito_client.global_sign_out(AccessToken=token)
        except Exception as e:
            print("Logout error:", e)

    # Clear the cookie
    response.delete_cookie(
        key="idToken",
        path="/",
        secure=True,
        httponly=True,
        samesite="strict"
    )
    return {"message": "Logged out"}