# routes/contacts.py

from fastapi import APIRouter, HTTPException, Body, Depends, Request
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import os
import hmac

# Import token validation logic
from src.validate import validate_token

router = APIRouter()

# MongoDB setup
uri = os.getenv("MONGODB_URI")
client = MongoClient(uri, server_api=ServerApi('1'))
db = client["UserContacts"]
contacts_collection = db["Contacts"]

SHARED_SECRET = os.getenv("SHARED_SECRET")


def verify_shared_secret(x_shared_secret: str = Depends(lambda request: request.headers.get("x-shared-secret"))):
    if not hmac.compare_digest(x_shared_secret or "", SHARED_SECRET or ""):
        raise HTTPException(status_code=403, detail="Unauthorized access")


def get_user_sub(request: Request) -> str:
    payload = validate_token(request)
    user_sub = payload.get("sub")
    if not user_sub:
        raise HTTPException(status_code=400, detail="Invalid token: no sub found")
    return user_sub


@router.get("/contacts")
def get_contacts(
    user_sub: str = Depends(get_user_sub),
    _: str = Depends(verify_shared_secret)
):
    contacts = list(
        contacts_collection.find(
            {"userId": user_sub},
            {"_id": 0, "email": 1, "firstName": 1, "lastName": 1}
        )
    )
    return {"contacts": contacts}


@router.post("/contacts")
def add_or_update_contact(
    contact: dict = Body(...),
    user_sub: str = Depends(get_user_sub),
    _: str = Depends(verify_shared_secret),
):
    email = contact.get("email")
    first = contact.get("firstName")
    last = contact.get("lastName")

    if not all([email, first, last]):
        raise HTTPException(status_code=400, detail="Missing required contact fields")

    contacts_collection.update_one(
        {"userId": user_sub, "email": email},
        {"$set": {"firstName": first, "lastName": last}},
        upsert=True
    )

    return {"message": "Contact added or updated successfully"}


@router.delete("/contacts")
def delete_contact(
    body: dict = Body(...),
    user_sub: str = Depends(get_user_sub),
    _: str = Depends(verify_shared_secret),
):
    email = body.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Missing 'email' in request")

    result = contacts_collection.delete_one({"userId": user_sub, "email": email})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")

    return {"message": "Contact deleted successfully"}
