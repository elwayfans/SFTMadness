from chatterbot import ChatBot
from chatterbot.trainers import ChatterBotCorpusTrainer
from datasets import load_dataset
ds = load_dataset("rtweera/customer_care_emails")
import sqlite3

chatbot = ChatBot('Ron Obvious',
                  logic_adapters=[
        "chatterbot.logic.BestMatch",
        'chatterbot.logic.MathematicalEvaluation',
    ],
)

# Create a new trainer for the chatbot
trainer = ChatterBotCorpusTrainer(chatbot)

# Train based on the english corpus
trainer.train(ds)

print("Type Something Here: \n")

while True:
    try:
        bot_input = input()
        
        if (bot_input.strip()=='Stop'):
                print('Dev.to: Bye')
                break
        
        bot_response = chatbot.get_response(bot_input)
        print(bot_response)

    except(KeyboardInterrupt, EOFError, SystemExit):
        break