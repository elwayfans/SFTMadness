from fastapi import APIRouter, HTTPException, Request, Depends, Body, status
import boto3
import os
import jwt
from botocore.exceptions import ClientError

public_router = APIRouter()
auth_router = APIRouter()

# Public Routes

@public_router.post("/resetPassword")
def initiate_forgot_password(payload: dict = Body(...)):
    cognito_client = boto3.client('cognito-idp', region_name=os.environ['AWS_REGION'])
    username = payload.get("email")
    
    if not username:
        raise HTTPException(status_code=400, detail="Username (email) is required")

    try:
        cognito_client.forgot_password(
            ClientId=os.environ['COGNITO_CLIENT_ID'],
            Username=username
        )
        return {"message": "Password reset code sent to email/SMS"}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Error sending reset code: {str(e)}")

@public_router.post("/confirmResetPassword")
def confirm_forgot_password(payload: dict = Body(...)):
    cognito_client = boto3.client('cognito-idp', region_name='us-east-2')
    
    username = payload.get("email")
    code = payload.get("code")
    new_password = payload.get("newPassword")

    if not username or not code or not new_password:
        raise HTTPException(status_code=400, detail="Username, code, and new password are required")

    try:
        cognito_client.confirm_forgot_password(
            ClientId=os.environ['COGNITO_CLIENT_ID'],
            Username=username,
            ConfirmationCode=code,
            Password=new_password
        )
        return {"message": "Password reset successfully"}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Error confirming reset: {str(e)}")


@public_router.post("/byEmail")
def get_user_by_email(payload: dict = Body(...)):
    cognito_client = boto3.client('cognito-idp', region_name=os.environ['AWS_REGION'])
    email = payload.get('email')

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    try:
        response = cognito_client.list_users(
            UserPoolId=os.environ['COGNITO_USER_POOL_ID'],
            Filter=f'email = "{email}"'
        )
        users = response.get('Users', [])

        if not users:
            raise HTTPException(status_code=404, detail="User not found")

        user = users[0]
        sub = next((attr['Value'] for attr in user['Attributes'] if attr['Name'] == 'sub'), None)

        if not sub:
            raise HTTPException(status_code=500, detail="User found but no sub attribute")

        return {"sub": sub}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving user: {str(e)}")

# Authenticated Routes

@auth_router.put("/update")
def update_user(payload: dict = Body(...)):
    cognito_client = boto3.client('cognito-idp', region_name=os.environ['AWS_REGION'])
    user_id = payload.get('userId')

    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    try:
        attributes = []
        if 'email' in payload:
            attributes.append({'Name': 'email', 'Value': payload['email']})
        if 'role' in payload:
            attributes.append({'Name': 'custom:role', 'Value': payload['role']})

        cognito_client.admin_update_user_attributes(
            UserPoolId=os.environ['COGNITO_USER_POOL_ID'],
            Username=user_id,
            UserAttributes=attributes
        )
        return {"message": "User updated successfully"}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Error updating user: {str(e)}")


@auth_router.delete("/delete")
def delete_user(payload: dict = Body(...)):
    cognito_client = boto3.client('cognito-idp', region_name=os.environ['AWS_REGION'])
    user_id = payload.get('userId')
    auth_header = payload.get('Authorization')

    if not user_id or not auth_header:
        raise HTTPException(status_code=400, detail="Missing required fields")

    token = auth_header.split(" ")[1] if " " in auth_header else auth_header

    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        requester_sub = decoded_token.get('sub')
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

    if user_id != requester_sub:
        raise HTTPException(status_code=403, detail="Unauthorized to delete this user")

    try:
        cognito_client.admin_delete_user(
            UserPoolId=os.environ['COGNITO_USER_POOL_ID'],
            Username=user_id
        )
        return {"message": "User deleted successfully"}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Error deleting user: {str(e)}")
    
@auth_router.get("/get")
def get_user(payload: dict = Body(...)):
    cognito_client = boto3.client('cognito-idp', region_name=os.environ['AWS_REGION'])
    user_id = payload.get('userId')

    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    try:
        response = cognito_client.admin_get_user(
            UserPoolId=os.environ['COGNITO_USER_POOL_ID'],
            Username=user_id
        )
        user_attributes = {attr['Name']: attr['Value'] for attr in response['UserAttributes']}
        return {"user": user_attributes}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving user: {str(e)}")
