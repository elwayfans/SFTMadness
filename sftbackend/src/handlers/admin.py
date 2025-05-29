import os
import traceback
import boto3
from fastapi import APIRouter, Request, HTTPException, Depends, Body
from botocore.exceptions import ClientError
from src.validate import validate_token, require_admin

router = APIRouter()

cognito_client = boto3.client("cognito-idp", region_name='us-east-2')
user_pool_id = os.environ["COGNITO_USER_POOL_ID"]

# Auth helper
def get_current_admin_user(request: Request):
    try:
        decoded_token = validate_token(request)
        print("Checking if Admin")
        require_admin(decoded_token)
        print("Admin check passed")
        return decoded_token
    except Exception as e:
        print("Exception occurred:", str(e))
        traceback.print_exc()
        raise HTTPException(status_code=401, detail="Invalid or unauthorized token")

# Create admin user
@router.post("/admins")
def create_admin(request: Request, payload: dict = Body(...), user=Depends(get_current_admin_user)):
    email = payload.get("email")
    password = payload.get("password")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    try:
        response = cognito_client.admin_create_user(
            UserPoolId=user_pool_id,
            Username=email,
            UserAttributes=[
                {"Name": "email", "Value": email},
                {"Name": "email_verified", "Value": "true"}
            ],
            TemporaryPassword=password,
        )

        cognito_client.admin_set_user_password(
            UserPoolId=user_pool_id,
            Username=email,
            Password=password,
            Permanent=True
        )
        
        cognito_client.admin_add_user_to_group(
            UserPoolId=user_pool_id,
            Username=email,
            GroupName="SFTAdmins"
        )

        return {"message": "Admin created successfully", "cognitoUser": response["User"]}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Error creating admin: {str(e)}")

# Update user role
@router.put("/admins")
def set_admin_role(request: Request, payload: dict = Body(...), user=Depends(get_current_admin_user)):
    username = payload.get("username")
    group_name = payload.get("groupName")

    if not username or not group_name:
        raise HTTPException(status_code=400, detail="Username and groupName are required")

    try:
        cognito_client.admin_add_user_to_group(
            UserPoolId=user_pool_id,
            Username=username,
            GroupName=group_name
        )
        return {"message": f"User role updated to {group_name}"}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Error updating user role: {str(e)}")

# Delete user
@router.delete("/admins/{user_id}")
def delete_user(user_id: str, request: Request, user=Depends(get_current_admin_user)):
    try:
        cognito_client.admin_delete_user(
            UserPoolId=user_pool_id,
            Username=user_id
        )
        return {"message": "User deleted successfully"}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Error deleting user: {str(e)}")

# Disable user
@router.put("/admins/disable/{user_id}")
def disable_user(user_id: str, request: Request, user=Depends(get_current_admin_user)):
    try:
        cognito_client.admin_disable_user(
            UserPoolId=user_pool_id,
            Username=user_id
        )
        return {"message": "User disabled successfully"}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Error disabling user: {str(e)}")
