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

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """Main Lambda handler."""
    try:
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
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Recipient email is required'})
            }
        
        message_id = send_email(
            recipient_email,
            subject,
            body_text,
            body_html,
            thread_id
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Email sent successfully',
                'messageId': message_id
            })
        }
        
    except Exception as e:
        logger.error(f"Error in lambda_handler: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
    
####################################
def get_db_connection():
    return psycopg2.connect(
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
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Incoming email processed successfully'})
        }
        
    except Exception as e:
        logger.error(f"Error processing incoming email: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

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