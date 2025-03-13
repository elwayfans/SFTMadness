from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings
from SchoolScraper.SchoolScraper.spiders.school_spider import SchoolSpider
from SchoolScraper.SchoolScraper.pipelines import ListCollectorPipeline
import json
import os
import boto3
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, date
import jwt
from jwt import algorithms
import requests

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
        if resource_path == '/scrape' and http_method == 'POST':
            return handle_scrape(event, context)
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
# Scraper functions

def handle_scrape(event, context):
    """
    Endpoint handler for triggering the scraper and saving the scraped data.
    """
    try:
        body = json.loads(event['body'])
        user_id = body.get('user_Id')
        filename = body.get('filename')
        filetype = body.get('filetype')

        if not user_id or not filename or not filetype:
            return cors_response(400, "User ID, filename, and filetype are required")

        scraper = Scraper(user_id)
        scraper.Start_Scraper()
        scraper.Save_Scraped_Data(filename, filetype)

        return cors_response(200, {
            "message": "Scraping completed successfully",
            "data": scraper.scraped_data
        })

    except Exception as e:
        return cors_response(500, str(e))

class Scraper:
    def __init__(self, user_id):
        self.user_id = user_id  # User ID to associate with the scraped data

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

    def Save_Scraped_Data(self, filename, filetype):
        """
        This function saves the scraped data to the scrapedfiles table in the database.

        Args:
            arg1: self, this allows for the call of variables that are instantiated within the class.
            arg2: filename, the name of the file to be saved.
            arg3: filetype, the type of the file to be saved.

        Returns:
            This function does not return anything.
        """
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            # Convert scraped data to JSON
            scraped_data_json = json.dumps(self.scraped_data)
            
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
                Body=scraped_data_json,
                ContentType=filetype
            )
            
            # Insert scraped data into the scrapedfiles table
            insert_query = """
                INSERT INTO scrapedfiles (userid, filename, filepath, filetype, uploaddate)
                VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
            """
            cur.execute(insert_query, (self.user_id, filename, filepath, filetype))
            conn.commit()
            
        except Exception as e:
            if conn:
                conn.rollback()
            raise Exception(f"Error saving scraped data to database: {str(e)}")
        finally:
            if conn:
                conn.close()