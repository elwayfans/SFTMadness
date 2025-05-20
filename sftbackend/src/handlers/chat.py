import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class ChatRequest(BaseModel):
    prompt: str
    company: str

def ask_ai(prompt, company):
    try:
        response = requests.post(
            "http://ai-acme:8001/chat",
            json={"prompt": prompt, "company": company},
            timeout=50,
        )
        response.raise_for_status()
        return response.json()["response"]
    except requests.RequestException as e:
        return f"AI error: {e}"

@router.post("/chat")
def chat_endpoint(request: ChatRequest):
    ai_response = ask_ai(request.prompt, request.company)
    if ai_response.startswith("AI error:"):
        raise HTTPException(status_code=502, detail=ai_response)
    return {"response": ai_response}