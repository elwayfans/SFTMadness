from pydantic import BaseModel, Field

class AIPersonality(BaseModel):
    modelname: str
    modellogo: str
    botintro: str
    botgoodbye: str
    botinstructions: str
    accent: str
    friendliness: int = Field(ge=0, le=10)  # Must be between 0 and 10
    formality: int = Field(ge=0, le=10)     # Must be between 0 and 10
    verbosity: int = Field(ge=0, le=10)    # Must be between 0 and 10
    humor: int = Field(ge=0, le=10)        # Must be between 0 and 10
    technicalLevel: int = Field(ge=0, le=10)  # Must be between 0 and 10