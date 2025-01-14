#import os
from mistralai import Mistral

api_key = "3PSD6r6khsS2Ar77OTgSf3Ccr2DDJvFG" #os.environ["MISTRAL_API_KEY"]
model = "pixtral-12b-2409"

client = Mistral(api_key=api_key)

chat_response = client.chat.complete(
    model= model,
    messages = [
        {
            "role": "user",
            "content": "Can you write an email as advertisement for the college 'Neumont College of Computer Science' ",
        },
    ]
)
print(chat_response.choices[0].message.content)