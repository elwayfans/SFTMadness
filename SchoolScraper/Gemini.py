from google import genai
from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings
from SchoolScraper.spiders.school_spider import SchoolSpider
from SchoolScraper.pipelines import ListCollectorPipeline
import psycopg2
import os

client = genai.Client(api_key="AIzaSyDC5YXVeiU3UPnKJZ2ev_HKTQtV20zSIDc")

class GeminiTrainingData:
    message_history = []
    scraped_data = []

    def Load_Scrapped_Information(self):
        """
        This function loads the html files from database into a string variable that is instatiated within the class

        Args:
            arg1: self, this allows for the call of variables that are instantiated within the class. This is used with scrapped info.

        Returns:
            This function does not return anything. Instead it sets a class variable
        """

    def Start_Scraper(self):
        # Initialize the pipeline
        pipeline = ListCollectorPipeline()

        # Configure settings
        settings = get_project_settings()
        # Add Playwright settings
        settings.set("DOWNLOAD_HANDLERS", {
            "http": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
            "https": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
        })

        settings.set("TWISTED_REACTOR", "twisted.internet.asyncioreactor.AsyncioSelectorReactor")

        # Enable the pipeline
        settings.set("ITEM_PIPELINES", {
            "SchoolScraper.pipelines.ListCollectorPipeline": 300,
        })

        # Define start URLs and allowed domains
        start_urls = ["https://www.neumont.edu/",
                "https://www.neumont.edu/degrees"]
        allowed_domains = ["neumont.edu"]

        # Create and run the crawler
        process = CrawlerProcess(settings)
        process.crawl(SchoolSpider, start_urls=start_urls, allowed_domains=allowed_domains)
        process.start()

        # Access the collected items
        self.scraped_data = pipeline.items

    def Generate_Data(self):
        """
        This function generates training data in a json format for later use in the AI email Generation

        Args:
            arg1: self, this allows for the call of variables that are instantiated within the class. This is used with scrapped info.

        Returns:
            This function returns Gemini's response which is in a Json format.
        """

        # starts scraping process
        self.Start_Scraper()
        # getting model response.
        response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=f"""You are an AI specialized in extracting structured information from raw text data scraped from school websites. 
        Your task is to analyze the provided text and identify relevant details about what the school offers, such as academic programs, scholarships, student services, and other key offerings.

            Format the extracted information into structured conversational pairs following this specific JSON format:
            (
                "role": "user",
                "content": "What scholarships do you offer?"
            ),
            (
                "role": "assistant",
                "content": "Great question! (college_name) offers a variety of scholarships, including merit-based awards for academic excellence, need-based assistance, and special grants for extracurricular achievements. Our admissions team is happy to guide you through the application process. Let me know if you'd like more details on specific opportunities!"
            )
            Instructions:
            Use only the provided scraped text {self.scraped_data}. Do not generate responses based on external knowledge or assumptions.
            Extract as many relevant user-assistant conversational pairs as possible while ensuring factual accuracy.
            Keep responses natural, engaging, and informative, making them suitable for a college inquiry chatbot.
            Ensure extracted information remains true to the original text without reinterpreting or fabricating details.

            Restrictions:
            Do not invent or assume any details about the school’s offerings beyond what is explicitly stated in the provided text.
            If certain details are unclear or missing, structure the response to reflect that uncertainty rather than making up information.
            Exclude irrelevant, redundant, or incomplete data that does not contribute to answering user inquiries.
            Your goal is to maximize the number of high-quality, factually accurate training pairs while strictly adhering to the provided scraped text.
        """
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

    def get_db_connection():
        return psycopg2.connect(
            dbname=os.environ['DB_NAME'],
            host=os.environ['DB_HOST'],
            user=os.environ['DB_USER'],
            password=os.environ['DB_PASSWORD'],
            port=os.environ['DB_PORT'],

            connect_timeout=5)

if __name__ == "__main__":
    gemini = GeminiTrainingData()
    #proper user loop
    while True:
        user_message = input(">: ")
        if (user_message == "scrape"):
            print(gemini.Generate_Data().text)
