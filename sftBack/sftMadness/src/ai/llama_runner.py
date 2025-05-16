import logging

logging.basicConfig(level=logging.INFO)

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
    logging.info(f"Generated prompt: {prompt}")
    try:
        response = llm(prompt)
        logging.info(f"Model response: {response}")
        return response["choices"][0]["text"]
    except Exception as e:
        logging.error(f"Error generating response: {e}")
        raise