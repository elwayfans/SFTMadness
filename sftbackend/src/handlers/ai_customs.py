from fastapi import APIRouter, HTTPException, Depends, Body, Query
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from datetime import datetime
import os
import json

from src.validate import validate_token

router = APIRouter()

# MongoDB setup
uri = os.getenv("MONGODB_URI")
client = MongoClient(uri, server_api=ServerApi('1'))
db = client["AICustoms"]
collection = db["AI_Organization_Customs"]

# Validation constants
REQUIRED_FIELDS = [
    'modelName', 'modelLogo', 'introduction', 'friendliness', 'formality',
    'accent', 'verbosity', 'humor', 'technicalLevel',
    'preferredGreeting', 'signatureClosing', 'instructions',
    'botHexBackgroundColor', 'botHexTextColor',
    'full_name', 'short_name', 'type', 'forbidden_terms'
]

RANGED_FIELDS = ['friendliness', 'formality', 'verbosity', 'humor', 'technicalLevel']

def validate_fields(data: dict):
    missing = [field for field in REQUIRED_FIELDS if field not in data]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing required fields: {', '.join(missing)}")

    for field in RANGED_FIELDS:
        try:
            value = int(data[field])
            if not (0 <= value <= 100):
                raise HTTPException(status_code=400, detail=f"{field.capitalize()} must be between 0 and 100")
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail=f"{field.capitalize()} must be an integer between 0 and 100")

    # Ensure forbidden_terms is a list (can be empty list)
    if not isinstance(data.get("forbidden_terms"), list):
        raise HTTPException(status_code=400, detail="forbidden_terms must be a list")

@router.post("/customs")
def set_customs(data: dict = Body(...), token_payload: dict = Depends(validate_token)):
    company = token_payload.get("custom:Company")
    if not company:
        raise HTTPException(status_code=400, detail="Token does not contain a company claim")

    validate_fields(data)

    item = {
        "company": company,
        **{field: data[field] for field in REQUIRED_FIELDS}
    }

    existing = collection.find_one({"company": company})
    if existing:
        collection.update_one({"company": company}, {"$set": item})
        return {"message": "Data updated successfully"}
    else:
        collection.insert_one(item)
        return {"message": "Data created successfully"}

@router.get("/customs")
def get_customs(company: str = Query(...)):
    """
    Get customs data for a company using a query parameter.
    Example: /customs?company=neumont
    """
    if not company:
        raise HTTPException(status_code=400, detail="Query must include a 'company' parameter")

    result = collection.find_one({"company": company}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="No data found for the specified company")

    return {"data": result}

@router.put("/customs")
def update_customs(data: dict = Body(...), token_payload: dict = Depends(validate_token)):
    company = token_payload.get("custom:Company")
    if not company:
        raise HTTPException(status_code=400, detail="Token does not contain a company claim")

    validate_fields(data)
    update_fields = {field: data[field] for field in REQUIRED_FIELDS}

    result = collection.update_one({"company": company}, {"$set": update_fields})

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Data not found")

    return {"message": "Data updated successfully"}

@router.delete("/customs")
def delete_customs(token_payload: dict = Depends(validate_token)):
    company = token_payload.get("custom:Company")
    if not company:
        raise HTTPException(status_code=400, detail="Token does not contain a company claim")

    result = collection.delete_one({"company": company})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Data not found")
    return {"message": "Data deleted successfully"}

@router.get("/customs/all")
def list_all_bots():
    bots = list(collection.find({}, {"_id": 0, "company": 1, "modelLogo": 1, "botHexTextColor": 1, "botHexBackgroundColor": 1}))
    # Ensure shared_data exists for each bot
    base_path = "/app/shared_data"
    for bot in bots:
        company = bot["company"]
        company_path = os.path.join(base_path, company)
        os.makedirs(company_path, exist_ok=True)
        knowledge_path = os.path.join(company_path, "college_knowledge.json")
        if not os.path.isfile(knowledge_path):
            with open(knowledge_path, "w", encoding="utf-8") as f:
                json.dump([], f)  # Start with an empty list or your default structure
    return {"bots": bots}