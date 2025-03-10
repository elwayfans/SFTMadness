import json
import os
import psycopg2
from datetime import datetime, date
import requests
from jwt import algorithms
import boto3
import jwt
from psycopg2.extras import RealDictCursor
from google import genai
from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings
from SchoolScraper.SchoolScraper.spiders.school_spider import SchoolSpider
from SchoolScraper.SchoolScraper.pipelines import ListCollectorPipeline

def cors_response(status_code, body, content_type="application/json"):
    headers = {
        'Content-Type': content_type,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE',
    }

    if content_type == "application/json":
        body = json.dumps(body, default=str)

    return {
        'statusCode': status_code,
        'body': body,
        'headers': headers,
    }

def lambda_handler(event, context):
    if event['httpMethod'] == 'OPTIONS':
        return cors_response(200, "ok")
    
    http_method = event['httpMethod']
    resource_path = event['resource']
    
    try:
        #verify token
        auth_header = event.get('headers', {}).get('Authorization')
        if not auth_header:
            return cors_response(401, "Unauthorized")
        
        token = auth_header.split(' ')[-1]
        verify_token(token)

    except Exception as e:
        return cors_response(401, "Authentication failed")
        
    #routes with authentication
    try:
        if resource_path == '/generate-data' and http_method == 'POST':
            return handle_generate_data(event, context)
        elif resource_path == '/save-data' and http_method == 'POST':
            return handle_save_data(event, context)
        elif resource_path == '/load-data' and http_method == 'GET':
            return handle_load_data(event, context)
        else:
            return cors_response(404, "Not Found")
        
    except Exception as e:
        return cors_response(500, str(e))
    
###################
#helper functions

def json_serial(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError ("Type %s not serializable" % type(obj))

def get_db_connection():
    return psycopg2.connect(
        dbname=os.environ['DB_NAME'],
        host=os.environ['DB_HOST'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        port=os.environ['DB_PORT'],

        connect_timeout=5)
    
#AUTH
def is_token_invalidated(token_payload):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            jti = token_payload.get('jti')
            
            if not jti:
                raise Exception("Token missing jti claim")
            
            cur.execute("""
                SELECT EXISTS(
                    SELECT 1 
                    FROM invalidated_tokens 
                    WHERE jti = %s
                )
            """, (jti,))
            
            return cur.fetchone()[0]

def verify_token(token):
    # Get the JWT token from the Authorization header
    if not token:
        raise Exception('No token provided')

    region = boto3.session.Session().region_name
    
    # Get the JWT kid (key ID)
    headers = jwt.get_unverified_header(token)
    kid = headers['kid']

    # Get the public keys from Cognito
    url = f'https://cognito-idp.{region}.amazonaws.com/{os.environ["COGNITO_USER_POOL_ID"]}/.well-known/jwks.json'
    response = requests.get(url)
    keys = response.json()['keys']

    # Find the correct public key
    public_key = None
    for key in keys:
        if key['kid'] == kid:
            public_key = algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
            break

    if not public_key:
        raise Exception('Public key not found')

    # Verify the token
    try:
        payload = jwt.decode(
            token,
            public_key,
            algorithms=['RS256'],
            audience=os.environ['COGNITO_CLIENT_ID'],
            options={"verify_exp": True}
        )

        if is_token_invalidated(payload):
            raise Exception('Token has been invalidated')
        
        return payload
    
    except jwt.ExpiredSignatureError:
        raise Exception('Token has expired')
    except jwt.InvalidTokenError:
        raise Exception('Invalid token')
    
####################
#customs functions

def handle_generate_data(event, context):
    """
    Endpoint handler for generating training data.
    """
    try:
        body = json.loads(event['body'])
        user_id = body.get('user_id')

        if not user_id:
            return cors_response(400, "User ID is required")

        gemini_training = GeminiTrainingData(user_id)
        response = gemini_training.Generate_Data()

        return cors_response(200, {
            "message": "Training data generated successfully",
            "data": response.text,
            "message_history": gemini_training.message_history  # Return the message history for saving
        })

    except Exception as e:
        return cors_response(500, str(e))

def handle_save_data(event, context):
    """
    Endpoint handler for saving training data.
    """
    try:
        body = json.loads(event['body'])
        user_id = body.get('user_id')
        filename = body.get('filename')
        filetype = body.get('filetype')
        message_history = body.get('message_history')  # Get the message history from the request body

        if not user_id or not filename or not filetype or not message_history:
            return cors_response(400, "User ID, filename, filetype, and message_history are required")

        gemini_training = GeminiTrainingData(user_id)
        gemini_training.Save_Data(filename, filetype, message_history)

        return cors_response(200, {
            "message": "Training data saved successfully"
        })

    except Exception as e:
        return cors_response(500, str(e))

def handle_load_data(event, context):
    """
    Endpoint handler for loading training data when visiting the webpage.
    """
    try:
        user_id = event['queryStringParameters'].get('user_id')

        if not user_id:
            return cors_response(400, "User ID is required")

        gemini_training = GeminiTrainingData(user_id)
        gemini_training.Load_Scrapped_Information()

        return cors_response(200, {
            "message": "Training data loaded successfully",
            "data": gemini_training.scraped_data
        })

    except Exception as e:
        return cors_response(500, str(e))

class GeminiTrainingData:
    message_history = []
    scraped_data = []
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

    def __init__(self, user_id):
        self.user_id = user_id  # User ID to associate with the training data

    def Load_Scrapped_Information(self):
        """
        This function loads the HTML files from the scrapecdfiles table into a string variable that is instantiated within the class.

        Args:
            arg1: self, this allows for the call of variables that are instantiated within the class. This is used with scraped info.

        Returns:
            This function does not return anything. Instead, it sets a class variable.
        """
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            # Fetch the latest file for the user from the scrapecdfiles table
            query = """
                SELECT filepath 
                FROM scrapecdfiles 
                WHERE userId = %s 
                ORDER BY uploaddate DESC 
                LIMIT 1
            """
            cur.execute(query, (self.user_id,))
            result = cur.fetchone()
            
            if result and result['filepath']:
                filepath = result['filepath']
                
                # Initialize S3 client
                s3_client = boto3.client('s3')
                bucket_name = os.environ['S3_BUCKET_NAME']
                
                # Fetch file content from S3
                response = s3_client.get_object(
                    Bucket=bucket_name,
                    Key=filepath
                )
                self.scraped_data = response['Body'].read().decode('utf-8')
            
        except Exception as e:
            raise Exception(f"Error loading scraped information from file: {str(e)}")
        finally:
            if conn:
                conn.close()

    def Start_Scraper(self):
        """
        This function initializes and runs the Scrapy spider to scrape data from the specified URLs.

        Args:
            arg1: self, this allows for the call of variables that are instantiated within the class.

        Returns:
            This function does not return anything. Instead, it sets a class variable with the scraped data.
        """
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
        This function generates training data in a JSON format for later use in the AI email generation.

        Args:
            arg1: self, this allows for the call of variables that are instantiated within the class.

        Returns:
            This function returns Gemini's response, which is in a JSON format.
        """
        # Start scraping process
        self.Start_Scraper()
        self.Load_Scrapped_Information()
        # Get model response
        response = self.client.models.generate_content(
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
        self.message_history.append(response.text)
        self.gemini_response = response.text
        return response

    def Save_Data(self, filename, filetype, message_history):
            """
            This function is used to save the training data to the scrapecdfiles table in order to be called at a later date.

            Args:
                arg1: self, this allows for the call of variables that are instantiated within the class.
                arg2: filename, the name of the file to be saved.
                arg3: filetype, the type of the file to be saved.
                arg4: message_history, the generated data to be saved.

            Returns:
                This function does not return anything.
            """
            conn = None
            try:
                conn = get_db_connection()
                cur = conn.cursor(cursor_factory=RealDictCursor)
                
                # Convert message history to JSON
                training_data_json = json.dumps(message_history)
                
                # Generate a unique filepath
                unique_filename = f"{self.user_id}/{filename}"
                filepath = f"user-{unique_filename}"
                
                # Initialize S3 client
                s3_client = boto3.client('s3')
                bucket_name = os.environ['S3_BUCKET_NAME']
                
                # Upload file content to S3
                s3_client.put_object(
                    Bucket=bucket_name,
                    Key=filepath,
                    Body=training_data_json,
                    ContentType=filetype
                )
                
                # Insert file into the scrapecdfiles table
                insert_query = """
                    INSERT INTO scrapecdfiles (userId, filename, filepath, filetype)
                    VALUES (%s, %s, %s, %s)
                """
                cur.execute(insert_query, (self.user_id, filename, filepath, filetype))
                conn.commit()
                
            except Exception as e:
                if conn:
                    conn.rollback()
                raise Exception(f"Error saving training data to database: {str(e)}")
            finally:
                if conn:
                    conn.close()