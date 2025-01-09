import requests
import json

chat_history = []

# response = requests.post(
#   url="https://openrouter.ai/api/v1/chat/completions",
#   headers={
#     "Authorization": "Bearer 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",
#     # "HTTP-Referer": "<YOUR_SITE_URL>", # Optional. Site URL for rankings on openrouter.ai.
#     # "X-Title": "<YOUR_SITE_NAME>", # Optional. Site title for rankings on openrouter.ai.
#   },
#   data=json.dumps({
#     "model": "meta-llama/llama-3.2-1b-instruct", # Optional
#     "messages": [
#       {
#         "role": "user",
#         # "content": "What is the meaning of life?"
#         "content": "cual es el significado de la vida?"
#       }
#     ]
    
#   })
# )

user_message = "What is the interest rate for savings accounts?"
chat_history.append({"role": "user", "content": user_message})

response = requests.post(
    url="https://openrouter.ai/api/v1/chat/completions",
    headers={
        "Authorization": "Bearer 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",
        "Content-Type": "application/json"
    },
    data=json.dumps({
        "model": "meta-llama/llama-3.2-1b-instruct",
        "messages": chat_history
    })
)

if response.status_code == 200:
    model_reply = response.json()["choices"][0]["message"]["content"]
    chat_history.append({"role": "assistant", "content": model_reply})
    print(f"Banking Assistant: {model_reply}")
else:
    print(f"Error: {response.status_code}")
    print(response.text)