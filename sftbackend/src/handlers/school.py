import os
import traceback
import boto3
from fastapi import APIRouter, Request, HTTPException, Depends
from src.validate import validate_token

router = APIRouter()


def get_current_user(request: Request):
    try:
        decoded_token = validate_token(request)
        print("Token validated")
        return decoded_token
    except Exception as e:
        print("Exception occurred:", str(e))
        traceback.print_exc()
        raise HTTPException(status_code=401, detail="Invalid or unauthorized token")

# Example endpoint: Return current school's profile
@router.get("/school/profile")
def get_school_profile(request: Request, user=Depends(get_current_user)):
    try:
        decoded_token = user
        return {
            "sub": decoded_token.get("sub"),
            "email": decoded_token.get("email"),
            "role": decoded_token.get("custom:role", "school"),
            "phone_number": decoded_token.get("phone_number"),
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Error retrieving profile: {str(e)}")
