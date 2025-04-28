from ai.llama_runner import run_llama
from models.personality import AIPersonality

def generate_bot_response(personality: AIPersonality):
    prompt = f"""
You are a school assistant bot.

Introduction: {personality.botintro}
Goodbye: {personality.botgoodbye}
Special Instructions: {personality.botinstructions}

Use a {personality.accent or 'neutral'} English accent.
Friendliness: {personality.friendliness}/10
Formality: {personality.formality}/10
Humor: {personality.humor}/10
Verbosity: {personality.verbosity}/10
Technical Knowledge: {personality.technicalLevel}/10

Say hello to a new student.
"""
    return run_llama(prompt)
