import requests
import json

api_key = "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"
endpoint = "https://openrouter.ai/api/v1/chat/completions"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

chat_history = []

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

print("Welcome to the Chatbot Test!")
print("Type your questions or type 'exit' to end the chat.\n")

while True:
    # Prompt the user for input
    user_input = input("You: ")
    if user_input.lower() == "exit":
        print("Ending the chat. Goodbye!")
        break

    # Send the user's input to the model and print the response
    model_response = send_message(user_input)
    print(f"Assistant: {model_response}")
