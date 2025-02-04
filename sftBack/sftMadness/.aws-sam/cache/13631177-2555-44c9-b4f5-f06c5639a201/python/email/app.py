import json
import boto3
from botocore.exceptions import ClientError
import os

def lambda_handler(event, context):
    # Get the recipient email from the event
    body = json.loads(event.get('body', '{}'))
    recipient_email = body.get('email')
    
    if not recipient_email:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Recipient email is required'})
        }

    # Create SES client
    ses = boto3.client('ses', region_name=os.environ['SES_REGION'])
    
    # Email content
    subject = 'Test Email from SFT AI'
    body_text = 'This is a test email from your SFT AI application.'
    body_html = f'''
    <html>
    <head></head>
    <body>
        <h1>Test Email</h1>
        <p>This is a test email from your SFT AI application.</p>
        <p>If you received this, your SES setup is working correctly!</p>
    </body>
    </html>
    '''

    try:
        response = ses.send_email(
            Source=os.environ['SES_SENDER_EMAIL'],
            Destination={
                'ToAddresses': [recipient_email]
            },
            Message={
                'Subject': {
                    'Data': subject
                },
                'Body': {
                    'Text': {
                        'Data': body_text
                    },
                    'Html': {
                        'Data': body_html
                    }
                }
            },
            ConfigurationSetName=os.environ['SES_CONFIGURATION_SET']
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Email sent successfully',
                'messageId': response['MessageId']
            })
        }
        
    except ClientError as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }