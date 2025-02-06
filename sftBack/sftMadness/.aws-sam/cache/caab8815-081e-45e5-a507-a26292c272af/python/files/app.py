import json
import os
import psycopg2
from datetime import datetime, date
import boto3
import base64
import jwt
from botocore.exceptions import ClientError
from psycopg2.extras import RealDictCursor
import requests
from jwt import algorithms
import uuid

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
        if resource_path == '/files' and http_method == 'POST':
            return uploadFile(event, context)
        elif resource_path == '/files/{fileId}' and http_method == 'GET':
            return getFile(event, context)
        elif resource_path == '/files/{fileId}' and http_method == 'DELETE':
            return deleteFile(event, context)
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
        host=os.environ['DB_HOST'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        port=os.environ['DB_PORT'],

        connect_timeout=5)
    
#AUTH
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
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception('Token has expired')
    except jwt.InvalidTokenError:
        raise Exception('Invalid token')

####################
#files functions

def uploadFile(event, context):
    conn = None
    try:
        # Get user ID from token
        auth_header = event.get('headers', {}).get('Authorization')
        token = auth_header.split(' ')[-1]
        token_payload = verify_token(token)
        user_id = token_payload.get('sub')

        # Parse multipart form data
        try:
            content_type = event['headers'].get('Content-Type', '')
            # if 'multipart/form-data' not in content_type:
            #     return cors_response(400, "Content-Type must be multipart/form-data")
            boundary = content_type.split('boundary=')[1]

            body = event.get('body', '')
            # Decode base64 body if it's encoded
            if event.get('isBase64Encoded', False):
                body = base64.b64decode(body)

            if isinstance(body, bytes):
                body = body.decode('utf-8')

            # Split the body by boundary
            parts = body.split('--' + boundary)
            
            # Initialize variables
            file_content = None
            filename = None
            filetype = None

            # Parse each part
            for part in parts:
                if 'name="file"' in part:
                    # Extract file content
                    file_content = part.split('\r\n\r\n')[1].strip()
                elif 'name="filename"' in part:
                    # Extract filename
                    filename = part.split('\r\n\r\n')[1].strip()
                elif 'name="filetype"' in part:
                    # Extract filetype
                    filetype = part.split('\r\n\r\n')[1].strip()

            if not filename or not filetype:
                return cors_response(400, "filename and filetype are required")

        except Exception as e:
            return cors_response(400, f"Error processing file upload: {str(e)}")

        # Generate unique filename
        unique_filename = f"{uuid.uuid4()}-{filename}"
        
        # Initialize S3 client
        s3_client = boto3.client('s3')
        bucket_name = os.environ['S3_BUCKET_NAME']

        try:
            # Upload to S3
            s3_response = s3_client.put_object(
                Bucket=bucket_name,
                Key=f"user-{user_id}/{unique_filename}",
                Body=file_content,
                ContentType=filetype
            )

            # Store file metadata in database
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)

            insert_query = """
                INSERT INTO files (userId, filename, filepath, filetype)
                VALUES (%s, %s, %s, %s)
                RETURNING id, userId, filename, filepath, filetype, uploadDate
            """
            filepath = f"user-{user_id}/{unique_filename}"
            cur.execute(insert_query, (user_id, filename, filepath, filetype))
            file_record = cur.fetchone()
            
            conn.commit()

            return cors_response(201, {
                "message": "File uploaded successfully",
                "file": file_record,
                "s3Response": s3_response
            })

        except ClientError as e:
            return cors_response(500, f"Error uploading to S3: {str(e)}")

    except Exception as e:
        if conn:
            conn.rollback()
        return cors_response(500, f"Error uploading file: {str(e)}")
    finally:
        if conn:
            conn.close()

def getFile(event, context):
    conn = None
    try:
        # Get file ID from path parameters
        file_id = event['pathParameters'].get('fileId')
        if not file_id:
            return cors_response(400, "File ID is required")

        # Get user ID from token
        auth_header = event.get('headers', {}).get('Authorization')
        token = auth_header.split(' ')[-1]
        token_payload = verify_token(token)
        user_id = token_payload.get('sub')

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Get file metadata from database
        cur.execute(
            "SELECT * FROM files WHERE id = %s AND userId = %s",
            (file_id, user_id)
        )
        file_record = cur.fetchone()

        if not file_record:
            return cors_response(404, "File not found or unauthorized access")

        # Initialize S3 client
        s3_client = boto3.client('s3')
        bucket_name = os.environ['S3_BUCKET_NAME']

        try:
            # Generate presigned URL for downloading
            presigned_url = s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': bucket_name,
                    'Key': file_record['filepath']
                },
                ExpiresIn=3600  # URL expires in 1 hour
            )

            return cors_response(200, {
                "file": file_record,
                "downloadUrl": presigned_url
            })

        except ClientError as e:
            return cors_response(500, f"Error generating download URL: {str(e)}")

    except Exception as e:
        return cors_response(500, f"Error retrieving file: {str(e)}")
    finally:
        if conn:
            conn.close()

def deleteFile(event, context):
    conn = None
    try:
        # Get file ID from path parameters
        file_id = event['pathParameters'].get('fileId')
        if not file_id:
            return cors_response(400, "File ID is required")

        # Get user ID from token
        auth_header = event.get('headers', {}).get('Authorization')
        token = auth_header.split(' ')[-1]
        token_payload = verify_token(token)
        user_id = token_payload.get('sub')

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Get file metadata and verify ownership
        cur.execute(
            "SELECT filepath FROM files WHERE id = %s AND userId = %s",
            (file_id, user_id)
        )
        file_record = cur.fetchone()

        if not file_record:
            return cors_response(404, "File not found or unauthorized access")

        # Initialize S3 client
        s3_client = boto3.client('s3')
        bucket_name = os.environ['S3_BUCKET_NAME']

        try:
            # Delete from S3
            s3_client.delete_object(
                Bucket=bucket_name,
                Key=file_record['filepath']
            )

            # Delete from database
            cur.execute(
                "DELETE FROM files WHERE id = %s AND userId = %s RETURNING id",
                (file_id, user_id)
            )
            deleted = cur.fetchone()

            if not deleted:
                return cors_response(404, "File not found or unauthorized access")

            conn.commit()

            return cors_response(200, {
                "message": "File deleted successfully",
                "fileId": file_id
            })

        except ClientError as e:
            return cors_response(500, f"Error deleting from S3: {str(e)}")

    except Exception as e:
        if conn:
            conn.rollback()
        return cors_response(500, f"Error deleting file: {str(e)}")
    finally:
        if conn:
            conn.close()