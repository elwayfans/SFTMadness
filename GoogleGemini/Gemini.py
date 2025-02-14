from google import genai

client = genai.Client(api_key="AIzaSyDC5YXVeiU3UPnKJZ2ev_HKTQtV20zSIDc")

class GeminiTrainingData:
    message_history = []
    scrapped_info = ""

    def Load_Scrapped_Information(self):
        """
        This function loads the html files from database into a string variable that is instatiated within the class

        Args:
            arg1: self, this allows for the call of variables that are instantiated within the class. This is used with scrapped info.

        Returns:
            This function does not return anything. Instead it sets a class variable
        """


    def Generate_Data(self):
        """
        This function generates training data in a json format for later use in the AI email Generation

        Args:
            arg1: self, this allows for the call of variables that are instantiated within the class. This is used with scrapped info.

        Returns:
            This function returns Gemini's response which is in a Json format.
        """

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
        {self.scrapped_info}"""
        )
        return response

    def Save_Data(self):
        """
            This function is used to save the training data to the database in order to be called at a later date.

            Args:
                arg1: self, this allows for the call of variables that are instantiated within the class. This is used with scrapped info.
            Returns:
                This function does not return anything.
        """
        pass