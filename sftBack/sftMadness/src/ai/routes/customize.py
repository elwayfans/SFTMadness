from fastapi import APIRouter
from models.personality import AIPersonality
from services.personality import generate_bot_response

router = APIRouter()

@router.post("/customize-bot")
def customize_bot(personality: AIPersonality):
    reply = generate_bot_response(personality)
    return {"preview_response": reply}
