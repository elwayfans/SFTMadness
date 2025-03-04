from openai import OpenAI
import os
import json
import psycopg2

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

model = "gpt-3.5-turbo-0125"

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
        
        self.add_system_prompt(f"You are a helpful assistant tasked with promoting {college_name}. \nEnsure all responses focus solely on {college_name}, its programs, values, achievements, and unique offerings. \nAvoid mentioning other institutions or making comparisons unless specifically asked to do so by the user.\ntry to keep things concise as possible, while still keeping the conversational/professional tone.\nEnsure that responses to prospective student questions use varied sentence structures and tones to keep the conversation engaging. \nAvoid reusing exact phrasing from the initial email.\nPrompt a few questions the user can ask you the assistant about the school. Questions like 'What degrees does {college_name} offer?'\nDo not suggest questions that have either already been answered or have been asked before.")
        
        self.load_message_history('sample.json')
        
    def create_message(self, role: str, message: str):
        """
            This function is to reduce redundancy within other functions in the class

            Args:
                arg1: string, pass in the role name of what type of message you are creating
                arg2: string, pass in the text of the message you want to add.

            Returns:
                function returns a dictionary with two key-value pairs:
                    "role" mapped to the role argument (a string).
                    "content" mapped to the message argument (a string).
        """
        return {"role": role, "content":message}

    def add_system_prompt(self, msg):
        """
            This function creates and appends a system prompt message to message history for use from the AI model

            Args:
                arg1: self, this allows for the call of variables that are instantiated within the class.
                arg2: string, pass in the text of the message you want to add.

            Returns:
                this function does not return anything, instead it appends to the class variable "message_history"
        """
        message = self.create_message("system", msg)
        self.message_history.append(message)

    def add_user_prompt(self, msg):
        """
            This function creates and appends a user prompt message to message history for use from the AI model

            Args:
                arg1: self, this allows for the call of variables that are instantiated within the class.
                arg2: string, pass in the text of the message you want to add.

            Returns:
                this function does not return anything, instead it appends to the class variable "message_history"
        """
        message = self.create_message("user", msg)
        self.message_history.append(message)
        
    def add_assistant_prompt(self, msg):
        """
            This function creates and appends a assistant prompt message to message history for use from the AI model

            Args:
                arg1: self, this allows for the call of variables that are instantiated within the class.
                arg2: string, pass in the text of the message you want to add.

            Returns:
                this function does not return anything, instead it appends to the class variable "message_history"
        """
        message = self.create_message("assistant", msg)
        self.message_history.append(message)

    def get_chat_response(self, msg):
        """
            This function gets the AI's response via an api call.

            Args:
            arg1: self, this allows for the call of variables that are instantiated within the class.
            arg2: string, pass in the message that you want to send to the AI for a response.

            Returns:
                this function returns the AI's response.
        """
        self.add_user_prompt(msg)
        
        chat_response = client.chat.completions.create(
            model=model,
            messages=self.message_history
        )
        
        agent_message = chat_response.choices[0].message
        self.add_assistant_prompt(agent_message.content)
        
        return agent_message
        
    def save_message_history(self):
        json_object = json.dumps(self.message_history, indent=4)
        with open("sample.json", "w") as outfile:
            outfile.write(json_object)
    
    def load_message_history(self, json_file_name):
        with open(json_file_name, 'r') as openfile:
            json_object = json.load(openfile)
            self.message_history = json_object

    def get_db_connection():
        return psycopg2.connect(
            dbname=os.environ['DB_NAME'],
            host=os.environ['DB_HOST'],
            user=os.environ['DB_USER'],
            password=os.environ['DB_PASSWORD'],
            port=os.environ['DB_PORT'],

            connect_timeout=5)



if __name__ == "__main__":
    college_name = "Neumont College of Computer Science"
    bot_name = "Billy"
    
    AIModel = AIModelClass(college_name, bot_name)
    
    #print(AIModel.message_history)

    AIModel.add_user_prompt(f"""Write a casual and inviting email to promote {college_name} to prospective students and their families. 
Use a friendly and personal tone. Highlight the school's unique features, such as academic programs, campus life, and opportunities for growth, in a concise manner. 
Mention that you are an AI assistant and encourage the recipient to reply with any questions they might have, offering examples of questions they can ask. 
Keep the email short and engaging.""")

    #prints original email
    chat_response = client.chat.completions.create(
            model=model,
            messages=AIModel.message_history
        )
    AIModel.add_assistant_prompt(chat_response.choices[0].message.content)
    print(chat_response.choices[0].message.content)
    

    #proper user loop
    while True:
        user_message = input(">: ")
        response = AIModel.get_chat_response(user_message)
        print(response.content)