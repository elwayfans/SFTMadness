import json
import os
import boto3
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, date
import jwt
from jwt import algorithms
import requests
from openai import OpenAI

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
    print("inside file handler")
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
        if resource_path == '/ai/chat' and http_method == 'POST':
            return handle_chat(event, context)
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
#model functions

def handle_chat(event, context):
    """
    Endpoint handler for having OpenAi generate a response to a user message.
    """
    try:
        body = json.loads(event['body'])
        user_message = body.get('message')
        college_name = body.get('college_name', 'Default College')
        bot_name = body.get('bot_name', 'Default Bot')
        contact_id = body.get('contact_id')  # Optional contact ID

        # Get user ID from token
        auth_header = event.get('headers', {}).get('Authorization')
        token = auth_header.split(' ')[-1]
        token_payload = verify_token(token)
        cognito_user_id = token_payload.get('sub')

        # Fetch user ID from the database
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id FROM users WHERE cognito_id = %s", (cognito_user_id,))
        db_user = cur.fetchone()
        if not db_user:
            return cors_response(404, "User not found")
        user_id = db_user['id']

        # Initialize AIModelClass with user_id and contact_id
        ai_model = AIModelClass(college_name, bot_name, os.environ.get("OPENAI_API_KEY"), user_id, contact_id)
        response = ai_model.get_chat_response(user_message)

        return cors_response(200, {
            "response": response.content
        })

    except Exception as e:
        return cors_response(500, str(e))

class AIModelClass:
    college_name = ""
    bot_name = ""
    message_history = []

    model = "gpt-3.5-turbo-0125"
    
    role_types = ['system', 'assistant', 'user']
    
    def __init__(self, college_name, bot_name, apikey, user_id, contact_id=None):
        self.college_name = college_name
        self.bot_name = bot_name
        self.client = OpenAI(api_key=apikey)
        self.user_id = int(user_id)  # Ensure user_id is an integer
        self.contact_id = contact_id  # Optional contact ID for conversations
        
        # Load custom variables from the database
        self.load_custom_variables()
        
        # Add system prompt with custom variables
        self.add_system_prompt(self.generate_system_prompt())
        
        self.load_message_history_from_db()  # Load message history from the database
        self.load_training_data_from_file()  # Load training data from a file in the database
        
    def create_message(self, role: str, message: str):
        return {"role": role, "content": message}

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
        
        chat_response = self.client.chat.completions.create(
            model=self.model,
            messages=self.message_history
        )
        
        agent_message = chat_response.choices[0].message
        self.add_assistant_prompt(agent_message.content)
        
        # Save updated message history to the database
        self.save_message_history()
        
        return agent_message
        
    def save_message_history(self):
        """
        Save the current message history to the database.
        This can be called after each interaction to persist the conversation.
        """
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            # Convert message history to JSON
            message_history_json = json.dumps(self.message_history)
            
            # Insert or update conversation logs in the database
            insert_query = """
                INSERT INTO conversationLogs (userId, contactId, interactionType, subject, content)
                VALUES (%s, %s, %s, %s, %s)
            """
            cur.execute(insert_query, (
                self.user_id,
                self.contact_id,  # Optional contact ID
                "AI_CHAT",  # Interaction type (e.g., AI_CHAT)
                f"Chat with {self.bot_name}",  # Subject
                message_history_json  # Content (message history)
            ))
            conn.commit()
            
        except Exception as e:
            if conn:
                conn.rollback()
            raise Exception(f"Error saving message history to database: {str(e)}")
        finally:
            if conn:
                conn.close()

    def load_message_history_from_db(self):
        """
        Load message history from the database for the given user.
        """
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            # Fetch the latest conversation log for the user
            query = """
                SELECT content 
                FROM conversationLogs 
                WHERE userId = %s 
                ORDER BY timestamp DESC 
                LIMIT 1
            """
            cur.execute(query, (self.user_id,))
            result = cur.fetchone()
            
            if result and result['content']:
                self.message_history = json.loads(result['content'])
            else:
                self.message_history = []  # Initialize empty history if no logs exist
            
        except Exception as e:
            raise Exception(f"Error loading message history from database: {str(e)}")
        finally:
            if conn:
                conn.close()

    def load_training_data_from_file(self):
        """
        Load training data from a file in the database and append it to the message history.
        """
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            # Fetch the latest file for the user
            query = """
                SELECT filepath 
                FROM files 
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
                file_content = response['Body'].read().decode('utf-8')
                
                # Append file content to message history as a system prompt
                self.add_system_prompt(file_content)
            
        except Exception as e:
            raise Exception(f"Error loading training data from file: {str(e)}")
        finally:
            if conn:
                conn.close()

    def load_custom_variables(self):
        """
        Load custom variables from the customs table for the given user.
        """
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            # Fetch custom variables for the user
            query = """
                SELECT friendliness, introduction, formality, accent, instructions 
                FROM customs 
                WHERE userId = %s 
                ORDER BY id DESC 
                LIMIT 1
            """
            cur.execute(query, (self.user_id,))
            result = cur.fetchone()
            
            if result:
                self.friendliness = result['friendliness']
                self.introduction = result['introduction']
                self.formality = result['formality']
                self.accent = result['accent']
                self.instructions = result['instructions']
            else:
                # Set default values if no custom variables are found
                self.friendliness = 5  # Default friendliness (1-10)
                self.introduction = "Hello! How can I assist you today?"
                self.formality = 5  # Default formality (1-10)
                self.accent = "neutral"  # Default accent
                self.instructions = "Be helpful and concise."
            
        except Exception as e:
            raise Exception(f"Error loading custom variables from database: {str(e)}")
        finally:
            if conn:
                conn.close()

    def generate_system_prompt(self):
        """
        Generate a system prompt using the custom variables.
        """
        return f"""
            You are a helpful assistant tasked with promoting {self.college_name}. 
            Ensure all responses focus solely on {self.college_name}, its programs, values, achievements, and unique offerings. 
            Avoid mentioning other institutions or making comparisons unless specifically asked to do so by the user.
            Try to keep things concise as possible, while still keeping the conversational/professional tone.
            Ensure that responses to prospective student questions use varied sentence structures and tones to keep the conversation engaging. 
            Avoid reusing exact phrasing from the initial email.
            Prompt a few questions the user can ask you the assistant about the school. Questions like 'What degrees does {self.college_name} offer?'
            Do not suggest questions that have either already been answered or have been asked before.
            
            Additional Instructions:
            - Friendliness: {self.friendliness}/10
            - Formality: {self.formality}/10
            - Accent: {self.accent}
            - Introduction: {self.introduction}
            - Instructions: {self.instructions}
        """