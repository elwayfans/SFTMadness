import os
import json
from mistralai import Mistral

#start of new implementation

api_key = os.environ.get('MISTRAL_API_KEY')
                         
model = "ministral-8b-latest"

client = Mistral(api_key=api_key)



class AIModelClass:
    college_name = ""
    bot_name = ""
    message_history = []
    
    
    role_types = ['system', 'assistant', 'user']
    
    #TODO: make save message history function and load message history function

    # Runs on instance of class creation
    def __init__(self, college_name, bot_name):
        self.college_name = college_name
        self.bot_name = bot_name
        
        self.load_message_history('sample.json')
        
    def create_message(self, role: str, message: str):
        return {"role": role, "content":message}

    def add_system_prompt(self, msg):
        message = self.create_message("system", msg)
        self.message_history.append(message)

    def add_user_prompt(self, msg):
        message = self.create_message("user", msg)
        self.message_history.append(message)
        
    def add_assistant_prompt(self, msg):
        message = self.create_message("assistant", msg)
        self.message_history.append(message)

    def get_chat_response(self, msg):
        self.add_user_prompt(msg)
        
        chat_response = client.chat.complete(
            model=model,
            messages=self.message_history
        )
        
        agent_message = chat_response.choices[0].message.content
        self.add_assistant_prompt(agent_message)
        
        return agent_message
    
    def training_data(self):
        self.add_user_prompt("What scholarships do you offer?")
        self.add_assistant_prompt(f"""Great question!
{college_name} offers a variety of scholarships, including merit-based awards for academic excellence, need-based assistance, and special grants for extracurricular achievements. 
Our admissions team is happy to guide you through the application process.
Let me know if you'd like more details on specific opportunities!""")
        
    def save_message_history(self):
        json_object = json.dumps(self.message_history, indent=4)
        with open("sample.json", "w") as outfile:
            outfile.write(json_object)
    
    def load_message_history(self, json_file_name):
        with open(json_file_name, 'r') as openfile:
            json_object = json.load(openfile)
            self.message_history = json_object
    
    
if __name__ == "__main__":
    college_name = "Neumont College of Computer Science"
    bot_name = "Billy"
    
    AIModel = AIModelClass(college_name, bot_name)

    AIModel.add_user_prompt(f"""Write a casual and inviting email to promote {college_name} to prospective students and their families. 
Use a friendly and personal tone. Highlight the school's unique features, such as academic programs, campus life, and opportunities for growth, in a concise manner. 
Mention that you are an AI assistant and encourage the recipient to reply with any questions they might have, offering examples of questions they can ask. 
Keep the email short and engaging.""")

    #prints original email
    chat_response = client.chat.complete(
            model=model,
            messages=AIModel.message_history
        )
    print(chat_response.choices[0].message.content)
    

    #proper user loop
    while True:
        user_message = input(">: ")
        response = AIModel.get_chat_response(user_message)
        print(response)