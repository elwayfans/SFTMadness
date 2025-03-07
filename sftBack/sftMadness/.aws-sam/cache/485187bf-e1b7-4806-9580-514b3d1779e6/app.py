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
import jwt
from jwt import algorithms
import requests
import string
import secrets
import random
from datetime import datetime, timedelta
from psycopg2.extras import RealDictCursor

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
                    public_key = algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
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
    if event['httpMethod'] == 'OPTIONS':
        return cors_response(200, "ok")
    
    print(f"Event received: {json.dumps(event)}")
    
    http_method = event['httpMethod']
    resource_path = event['resource']
    
    try:
        #verify token
        auth_header = event.get('headers', {}).get('Authorization')
        print(f"Auth header: {auth_header}")
        if not auth_header:
            return cors_response(401, "Unauthorized")
        if not auth_header.startswith('Bearer '):
            return cors_response(401, "Invalid Authorization header format. Must start with 'Bearer '")
        
        token = auth_header.split(' ')[-1]

        try:
            token_payload = verify_token(token)
            print(f"Token verified successfully: {json.dumps(token_payload)}")
        except Exception as e:
            print(f"Token verification failed: {str(e)}")
            return cors_response(401, f"Authentication failed: {str(e)}")

    except Exception as e:
        return cors_response(401, "Authentication failed")
        
    try:
        if resource_path == '/sendEmail' and http_method == 'POST':
            return sendEmail(event, context)
        elif resource_path == '/passVerificationEmail' and http_method == 'POST':
            return send_password_verification_email(event, context)
        else:
            return cors_response(404, "Not Found")
        
    except Exception as e:
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

#generate random verification code
def generate_verification_code(length=6):
    """Generate a random verification code of specified length."""
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for i in range(length))

#store verification code in database
def store_verification_code(email, code):
    """Store the verification code in the database with an expiration time."""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get user ID from email
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        
        if not user:
            return None
            
        # Set expiration time (1 hour from now)
        expiration_time = datetime.now() + timedelta(hours=1)
        
        # Check if a code already exists for this user
        cur.execute(
            "SELECT id FROM password_reset_codes WHERE user_id = %s", 
            (user['id'],)
        )
        
        existing_code = cur.fetchone()
        
        if existing_code:
            # Update existing code
            cur.execute(
                """UPDATE password_reset_codes 
                SET code = %s, created_at = CURRENT_TIMESTAMP, expires_at = %s 
                WHERE user_id = %s RETURNING id""",
                (code, expiration_time, user['id'])
            )
        else:
            # Insert new code
            cur.execute(
                """INSERT INTO password_reset_codes (user_id, code, created_at, expires_at) 
                VALUES (%s, %s, CURRENT_TIMESTAMP, %s) RETURNING id""",
                (user['id'], code, expiration_time)
            )
            
        code_id = cur.fetchone()['id']
        conn.commit()
        
        return {
            'user_id': user['id'],
            'code_id': code_id
        }
        
    except Exception as e:
        print(f"Database error: {str(e)}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()

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

#send email
def sendEmail(recipient_email, subject, body_text, body_html, thread_id=None):
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

#send verification email
def send_password_verification_email(event, context):
    """Handler for sending password reset verification emails"""
    conn = None
    try:
        # Parse request body
        try:
            body = json.loads(event.get('body', '{}'))
        except json.JSONDecodeError as e:
            return cors_response(400, {"error": f"Invalid JSON: {str(e)}"})
        
        email = body.get('email')
        
        if not email:
            return cors_response(400, {"error": "Email is required"})
        
        # Generate verification code (6 characters, uppercase letters and digits)
        verification_code = ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(6))
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get user ID from email
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        
        if not user:
            return cors_response(404, {"error": "User not found"})
        
        user_id = user['id']
            
        # Set expiration time (1 hour from now)
        expiration_time = datetime.now() + timedelta(hours=1)
        
        # Check if a code already exists for this user
        cur.execute(
            "SELECT id FROM password_reset_codes WHERE user_id = %s", 
            (user_id,)
        )
        
        existing_code = cur.fetchone()
        
        if existing_code:
            # Update existing code
            cur.execute(
                """UPDATE password_reset_codes 
                SET code = %s, created_at = CURRENT_TIMESTAMP, expires_at = %s 
                WHERE user_id = %s RETURNING id""",
                (verification_code, expiration_time, user_id)
            )
        else:
            # Insert new code
            cur.execute(
                """INSERT INTO password_reset_codes (user_id, code, created_at, expires_at) 
                VALUES (%s, %s, CURRENT_TIMESTAMP, %s) RETURNING id""",
                (user_id, verification_code, expiration_time)
            )
            
        code_id = cur.fetchone()['id']
        
        # HTML email content
        html_content = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #4a90e2; color: white; padding: 10px 20px; }}
                .content {{ padding: 20px; border: 1px solid #ddd; }}
                .code {{ font-size: 24px; font-weight: bold; color: #4a90e2; letter-spacing: 3px; }}
                .footer {{ margin-top: 20px; font-size: 12px; color: #999; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Password Reset Request</h2>
                </div>
                <div class="content">
                    <p>We received a request to reset your password. Please use the following verification code to complete the process:</p>
                    <p class="code">{verification_code}</p>
                    <p>This code will expire in 1 hour.</p>
                    <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
                </div>
                <div class="footer">
                    <p>This is an automated message, please do not reply.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text version
        text_content = f"""
        Password Reset Request
        
        We received a request to reset your password. Please use the following verification code to complete the process:
        
        {verification_code}
        
        This code will expire in 1 hour.
        
        If you didn't request a password reset, please ignore this email or contact support if you have concerns.
        
        This is an automated message, please do not reply.
        """
        
        # Send the email using your existing send_email function or SES directly
        ses_client = boto3.client('ses', region_name=os.environ['SES_REGION'])
        
        configuration_set = os.environ.get('SES_CONFIGURATION_SET', '')
        
        email_params = {
            'Source': os.environ['SES_SENDER_EMAIL'],
            'Destination': {
                'ToAddresses': [email]
            },
            'Message': {
                'Subject': {
                    'Data': 'Password Reset Verification Code',
                    'Charset': 'UTF-8'
                },
                'Body': {
                    'Text': {
                        'Data': text_content,
                        'Charset': 'UTF-8'
                    },
                    'Html': {
                        'Data': html_content,
                        'Charset': 'UTF-8'
                    }
                }
            }
        }
        
        # Add configuration set if specified
        if configuration_set:
            email_params['ConfigurationSetName'] = configuration_set
            
        response = ses_client.send_email(**email_params)
        message_id = response['MessageId']
        
        conn.commit()
        
        return cors_response(200, {
            "message": "Verification code sent successfully",
            "userId": user_id,
            "messageId": message_id
        })
        
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        if conn:
            conn.rollback()
        return cors_response(500, {"error": f"Internal server error: {str(e)}"})
    finally:
        if conn:
            conn.close()