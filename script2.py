import requests
import json

# Define API key and endpoint
api_key = "your-api-key-here"
endpoint = "https://openrouter.ai/api/v1/chat/completions"
headers = {
    "Authorization": "Bearer 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",
    "Content-Type": "application/json"
}

# Initialize chat history
chat_history = []

# Function to send a message to the model
def send_message(message):
    global chat_history
    chat_history.append({"role": "user", "content": message})

    response = requests.post(
        url=endpoint,
        headers=headers,
        data=json.dumps({
            "model": "meta-llama/llama-3.2-1b-instruct",
            "messages": chat_history
        })
    )
    
    if response.status_code == 200:
        model_reply = response.json()["choices"][0]["message"]["content"]
        chat_history.append({"role": "assistant", "content": model_reply})
        return model_reply
    else:
        return f"Error: {response.status_code} - {response.text}"

# Step 1: Provide the model with information
print("Step 1: Provide information to the model.")
info_message = "My favorite color is blue, and I love hiking in the mountains."
response = send_message(info_message)
print(f"Assistant: {response}")

# Step 2: Ask the model to recall earlier information
print("\nStep 2: Ask the model to recall information.")
recall_message = "Can you remind me of my favorite color and hobby?"
response = send_message(recall_message)
print(f"Assistant: {response}")

# Step 3: Evaluate the response
print("\nStep 3: Evaluate whether the model recalls the information correctly.")
if "blue" in response.lower() and "hiking" in response.lower():
    print("Test Passed: The model recalled the earlier information correctly.")
else:
    print("Test Failed: The model did not recall the earlier information correctly.")
