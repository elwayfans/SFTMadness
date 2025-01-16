#import os
from mistralai import Mistral

#start of new implementation
message_history = []

api_key = "3PSD6r6khsS2Ar77OTgSf3Ccr2DDJvFG" #os.environ["MISTRAL_API_KEY"]
model = "pixtral-12b-2409"

client = Mistral(api_key=api_key)

college_name = "Neumont College of Computer Science"
bot_name = "Billy"

def add_system_prompt(message):
    message_history.append({"role": "system", "content":message})

def add_user_prompt(message):
    message_history.append({"role": "user", "content":message})
    
def add_assistant_prompt(message):
    message_history.append({"role": "assistant", "content":message})

def get_chat_response(message):
    message_history.append({"role": "user", "content":message})
    
    chat_response = client.chat.complete(
        model=model,
        messages=message_history
    )
    
    agent_message = chat_response.choices[0].message.content
    message_history.append({"role": "assistant", "content":agent_message})
    
    return agent_message

#system prompts, these are what control the AI's rule set and what it should follow over what the user says
add_system_prompt(f"""You are a helpful assistant tasked with promoting {college_name}. 
                  Ensure all responses focus solely on {college_name}, its programs, values, achievements, and unique offerings. 
                  Avoid mentioning other institutions or making comparisons unless specifically asked to do so by the user.""")

add_system_prompt("try to keep things concise as possible, while still keeping the conversational/professional tone.")

add_system_prompt("""Ensure that responses to prospective student questions use varied sentence structures and tones to keep the conversation engaging. 
                  Avoid reusing exact phrasing from the initial email.""")

add_system_prompt("Prompt a few questions the user can ask you the assistant about the school. Questions like 'What degrees does neumont offer?'")

add_user_prompt(f"""Write a casual and inviting email to promote {college_name} to prospective students and their families. 
                Use a friendly and personal tone. Highlight the school's unique features, such as academic programs, campus life, and opportunities for growth, in a concise manner. 
                Mention that you are an AI assistant and encourage the recipient to reply with any questions they might have, offering examples of questions they can ask. 
                Keep the email short and engaging.""")

#prints original email
chat_response = client.chat.complete(
        model=model,
        messages=message_history
    )
print(chat_response.choices[0].message.content)

add_user_prompt("What scholarships do you offer?")
add_assistant_prompt(f"""Great question!
                     {college_name} offers a variety of scholarships, including merit-based awards for academic excellence, need-based assistance, and special grants for extracurricular achievements. 
                     Our admissions team is happy to guide you through the application process.
                     Let me know if you'd like more details on specific opportunities!""")

#proper user loop
while True:
    user_message = input(">: ")
    response = get_chat_response(user_message)
    print(response)