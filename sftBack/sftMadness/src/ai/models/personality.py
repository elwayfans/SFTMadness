from pydantic import BaseModel

class AIPersonality(BaseModel):
    modelname: str
    modellogo: str
    botintro: str
    botgoodbye: str
    botinstructions: str
    accent: str
    friendliness: int
    formality: int
    verbosity: int
    humor: int
    technicalLevel: int
