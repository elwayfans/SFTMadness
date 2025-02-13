from google import genai

file = open('C:\\Users\\elija\\Documents\\Neumont School Work\\SFTMadness-EP1\\SchoolScraper\\school-home.html', 'r')
client = genai.Client(api_key="AIzaSyDC5YXVeiU3UPnKJZ2ev_HKTQtV20zSIDc")

response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents=f"""Please parse through this html to find relevant text, into a json training format for another ai that talks about what the school provides. This is the specific format I want you to use
    (
        "role": "user",
        "content": "What scholarships do you offer?"
    ),
    (
        "role": "assistant",
        "content": "Great question! (college_name) offers a variety of scholarships, including merit-based awards for academic excellence, need-based assistance, and special grants for extracurricular achievements. Our admissions team is happy to guide you through the application process. Let me know if you'd like more details on specific opportunities!"
    )
    this is the file I want you to parse.
    {file.readlines()}""",
    
    #contents="how do I create system messages, user messages, and assisstant messages with gemini?"
)
file.close

print(response.text)
file = open('TrainingData.json', 'w')
file.write(response.text)
file.close()

class GeminiTrainingData:
    
    
    pass