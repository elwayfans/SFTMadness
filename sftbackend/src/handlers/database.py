from fastapi import APIRouter, Request, Header, HTTPException, Body, Depends
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import os
import hmac

# Import validate_token
from src.validate import validate_token

router = APIRouter()

# MongoDB setup
uri = os.getenv("MONGODB_URI")
client = MongoClient(uri, server_api=ServerApi('1'))
db = client["SFTMadnessUserData"]
collection = db["SFTMadnessUserData"]

SHARED_SECRET = os.getenv("SHARED_SECRET")

# Dependencies

def verify_shared_secret(x_shared_secret: str = Depends(lambda request: request.headers.get("x-shared-secret"))):
    if not hmac.compare_digest(x_shared_secret or "", SHARED_SECRET or ""):
        raise HTTPException(status_code=403, detail="Unauthorized access")


def get_user_sub(request: Request) -> str:
    payload = validate_token(request)
    user_sub = payload.get("sub")
    if not user_sub:
        raise HTTPException(status_code=400, detail="Invalid token: no sub found")
    return user_sub

# Routes

@router.post("/database")
def create_or_update_data(
    request: Request,
    body: dict = Body(...),
    user_sub: str = Depends(get_user_sub),
    _: str = Depends(verify_shared_secret),
):
    body_sub = body.get("sub")
    body_url = body.get("url")

    if not body_sub or not body_url:
        raise HTTPException(status_code=400, detail="Request must include 'sub' and 'url'")

    if body_sub != user_sub:
        raise HTTPException(status_code=403, detail="You can only modify your own data")

    item = {"sub": user_sub, "url": body_url}

    existing_item = collection.find_one({"sub": user_sub})
    if existing_item:
        collection.update_one({"sub": user_sub}, {"$set": item})
        return {"message": "Data updated successfully"}
    else:
        collection.insert_one(item)
        return {"message": "Data created successfully"}


@router.get("/database")
def get_all_data(_: str = Depends(verify_shared_secret)):
    items = list(collection.find({}, {"_id": 0}))
    return {"data": items}


@router.delete("/database")
def delete_user_data(
    request: Request,
    body: dict = Body(...),
    user_sub: str = Depends(get_user_sub),
    _: str = Depends(verify_shared_secret),
):
    if "sub" not in body:
        raise HTTPException(status_code=400, detail="Missing 'sub' key")

    if body["sub"] != user_sub:
        raise HTTPException(status_code=403, detail="You can only delete your own data")

    result = collection.delete_one({"sub": user_sub})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Data not found")
    return {"message": "Data deleted successfully"}
