import json
import boto3
from botocore.exceptions import ClientError
import os
from datetime import datetime
import email
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
import psycopg2
from psycopg2.extras import Json
import jwt
from jwt import algorithm
import requests

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def cors_response(status_code, body, content_type="application/json"):
    headers = {
        'Content-Type': content_type,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE',
    }

    if content_type == "application/json":
        body = json.dumps(body)

    return {
        'statusCode': status_code,
        'body': body,
        'headers': headers,
    }

# AUTH
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
    try:
        if not token:
            raise Exception('No token provided')

        region = boto3.session.Session().region_name

        try:
            headers = jwt.get_unverified_header(token)
            kid = headers['kid']
        except Exception as e:
            print(f"Error getting token header: {str(e)}")
            raise Exception(f'Invalid token header: {str(e)}')

        try:
            url = f'https://cognito-idp.{region}.amazonaws.com/{os.environ["COGNITO_USER_POOL_ID"]}/.well-known/jwks.json'
            response = requests.get(url)
            response.raise_for_status()
            keys = response.json()['keys']
        except Exception as e:
            print(f"Error fetching keys: {str(e)}")
            raise Exception(f'Error fetching public keys: {str(e)}')

        public_key = None
        for key in keys:
            if key['kid'] == kid:
                try:
                    public_key = algorithm.RSAAlgorithm.from_jwk(json.dumps(key))
                    break
                except Exception as e:
                    raise Exception(f'Error parsing public key: {str(e)}')

        if not public_key:
            raise Exception('Public key not found')

        try:
            payload = jwt.decode(
                token,
                public_key,
                algorithms=['RS256'],
                options={
                    'verify_signature': True,
                    'verify_exp': True,
                    'verify_aud': True,
                    'verify_iss': True
                },
                audience=os.environ['COGNITO_CLIENT_ID'],
                issuer=f'https://cognito-idp.us-east-2.amazonaws.com/{os.environ["COGNITO_USER_POOL_ID"]}'
            )
            
            # Check if token has been invalidated
            if is_token_invalidated(payload):
                raise Exception('Token has been invalidated')
                
            return payload
            
        except jwt.ExpiredSignatureError:
            raise Exception('Token has expired')
        except jwt.InvalidTokenError:
            raise Exception('Invalid token')
        except Exception as e:
            raise Exception(f'Token verification error: {str(e)}')

    except Exception as e:
        print(f"Token verification failed: {str(e)}")

#########################################
def lambda_handler(event, context):
    """Main Lambda handler."""
    if event['httpMethod'] == 'OPTIONS':
        return cors_response(200, "ok")
    
    try:
        auth_header = event.get('headers', {}).get('Authorization')
        if not auth_header:
            return cors_response(401, "No authorization token provided")

        if not auth_header.startswith('Bearer '):
            return cors_response(401, "Invalid authorization header format. Must start with 'Bearer'")

        token = auth_header.replace('Bearer ', '')

        try:
            token_payload = verify_token(token)
            if is_token_invalidated(token_payload):
                return cors_response(401, "Token has been invalidated")
        except Exception as e:
            return cors_response(401, f"Authentication failed: {str(e)}")
        
        # Check if this is an incoming email from SES
        if event.get('Records', []) and event['Records'][0].get('eventSource') == 'aws:ses':
            return process_incoming_email(event)
        
        # Otherwise, handle direct API calls
        body = json.loads(event.get('body', '{}'))
        recipient_email = body.get('email')
        subject = body.get('subject', 'Message from SFT AI')
        body_text = body.get('body_text', '')
        body_html = body.get('body_html', '')
        thread_id = body.get('thread_id')
        
        if not recipient_email:
            return cors_response(400, "Recipient email is required")
        
        message_id = send_email(
            recipient_email,
            subject,
            body_text,
            body_html,
            thread_id
        )
        
        return cors_response(200, {
            'message': 'Email sent successfully',
            'messageId': message_id
        })
        
    except Exception as e:
        logger.error(f"Error in lambda_handler: {str(e)}")
        return cors_response(500, str(e))
    
####################################
def get_db_connection():
    return psycopg2.connect(
        dbname=os.environ['DB_NAME'],
        host=os.environ['DB_HOST'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        port=os.environ['DB_PORT'],

        connect_timeout=5)

#######################################
# Functions
def create_email_message(subject, body_text, body_html, recipient_email, thread_id=None):
    """Create a MIME message with both text and HTML versions."""
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = os.environ['SES_SENDER_EMAIL']
    msg['To'] = recipient_email
    
    # Add custom headers for threading
    if thread_id:
        msg['References'] = thread_id
        msg['In-Reply-To'] = thread_id
    else:
        msg['Message-ID'] = f'<{datetime.now().timestamp()}@{os.environ["SES_DOMAIN"]}>'
    
    # Attach parts
    msg.attach(MIMEText(body_text, 'plain'))
    msg.attach(MIMEText(body_html, 'html'))
    
    return msg

def store_conversation(user_email, message_content, message_id, thread_id, direction):
    """Store conversation in database for context tracking."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Create table if it doesn't exist
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS email_conversations (
                        id SERIAL PRIMARY KEY,
                        email VARCHAR(255) NOT NULL,
                        timestamp TIMESTAMP NOT NULL,
                        message_id VARCHAR(255) NOT NULL,
                        thread_id VARCHAR(255) NOT NULL,
                        content TEXT NOT NULL,
                        direction VARCHAR(50) NOT NULL,
                        metadata JSONB DEFAULT '{}'::jsonb,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Create index for faster queries
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_email_thread 
                    ON email_conversations(email, thread_id)
                """)
                
                # Insert conversation record
                cur.execute("""
                    INSERT INTO email_conversations 
                    (email, timestamp, message_id, thread_id, content, direction)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    user_email,
                    datetime.now(),
                    message_id,
                    thread_id,
                    message_content,
                    direction
                ))
                
                conn.commit()
        return True
    except Exception as e:
        logger.error(f"Failed to store conversation: {str(e)}")
        return False

def get_conversation_history(user_email, thread_id):
    """Retrieve conversation history for context."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT content, direction, timestamp 
                    FROM email_conversations 
                    WHERE email = %s AND thread_id = %s
                    ORDER BY timestamp ASC
                """, (user_email, thread_id))
                
                conversations = cur.fetchall()
                
                return [{
                    'content': content,
                    'direction': direction,
                    'timestamp': timestamp.isoformat()
                } for content, direction, timestamp in conversations]
    except Exception as e:
        logger.error(f"Failed to retrieve conversation history: {str(e)}")
        return []

async def get_ai_response(message_content, conversation_history):
    """Get AI response based on message content and conversation history."""
    # This is a placeholder - implement your AI model integration here
    # You might want to call your AI service or use a language model API
    return {
        'subject': 'Re: Your message',
        'body_text': 'AI response in plain text',
        'body_html': '<p>AI response in HTML</p>'
    }

def process_incoming_email(event):
    """Process incoming email from SES."""
    ses_notification = event['Records'][0]['ses']
    message = ses_notification['mail']
    
    # Get the email content from S3 (SES stores the email in S3)
    s3 = boto3.client('s3')
    bucket = os.environ['EMAIL_BUCKET']
    key = message['messageId']
    
    try:
        email_obj = s3.get_object(Bucket=bucket, Key=key)
        email_content = email_obj['Body'].read().decode('utf-8')
        
        # Parse email
        msg = email.message_from_string(email_content)
        thread_id = msg.get('References', msg.get('Message-ID'))
        from_address = msg.get('From')
        subject = msg.get('Subject')
        
        # Extract text content
        text_content = ''
        for part in msg.walk():
            if part.get_content_type() == 'text/plain':
                text_content += part.get_payload(decode=True).decode()
        
        # Store incoming message
        store_conversation(
            from_address,
            text_content,
            message['messageId'],
            thread_id,
            'incoming'
        )
        
        # Get conversation history
        history = get_conversation_history(from_address, thread_id)
        
        # Get AI response
        ai_response = get_ai_response(text_content, history)
        
        # Send AI response
        send_email(
            from_address,
            ai_response['subject'],
            ai_response['body_text'],
            ai_response['body_html'],
            thread_id
        )
        
        return cors_response(200, {'message': 'Incoming email processed successfully'})
        
    except Exception as e:
        logger.error(f"Error processing incoming email: {str(e)}")
        return cors_response(500, "Error processing incoming email")

def send_email(recipient_email, subject, body_text, body_html, thread_id=None):
    """Send email using SES."""
    ses = boto3.client('ses', region_name=os.environ['SES_REGION'])
    
    try:
        msg = create_email_message(
            subject,
            body_text,
            body_html,
            recipient_email,
            thread_id
        )
        
        response = ses.send_raw_email(
            Source=os.environ['SES_SENDER_EMAIL'],
            Destinations=[recipient_email],
            RawMessage={'Data': msg.as_string()},
            ConfigurationSetName=os.environ['SES_CONFIGURATION_SET']
        )
        
        # Store outgoing message
        store_conversation(
            recipient_email,
            body_text,
            response['MessageId'],
            thread_id or msg['Message-ID'],
            'outgoing'
        )
        
        return response['MessageId']
    
    except ClientError as e:
        logger.error(f"Error sending email: {str(e)}")
        raise