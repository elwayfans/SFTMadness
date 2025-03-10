import json
import os
import boto3
import psycopg2
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
    try:
        body = json.loads(event['body'])
        user_message = body.get('message')
        college_name = body.get('college_name', 'Default College')
        bot_name = body.get('bot_name', 'Default Bot')

        ai_model = AIModelClass(college_name, bot_name, os.environ.get("OPENAI_API_KEY"))
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
    
    def __init__(self, college_name, bot_name, apikey):
        self.college_name = college_name
        self.bot_name = bot_name
        self.client = OpenAI(api_key=apikey)

        self.add_system_prompt(f"You are a helpful assistant tasked with promoting {college_name}. \nEnsure all responses focus solely on {college_name}, its programs, values, achievements, and unique offerings. \nAvoid mentioning other institutions or making comparisons unless specifically asked to do so by the user.\ntry to keep things concise as possible, while still keeping the conversational/professional tone.\nEnsure that responses to prospective student questions use varied sentence structures and tones to keep the conversation engaging. \nAvoid reusing exact phrasing from the initial email.\nPrompt a few questions the user can ask you the assistant about the school. Questions like 'What degrees does {college_name} offer?'\nDo not suggest questions that have either already been answered or have been asked before.")
        
        self.load_message_history('sample.json')
        
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
        
        return agent_message