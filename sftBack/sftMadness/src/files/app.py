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
import re

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
#files functions

def uploadFile(event, context):
    conn = None
    try:
        # Get user ID from token
        auth_header = event.get('headers', {}).get('Authorization')
        token = auth_header.split(' ')[-1]
        token_payload = verify_token(token)
        cognito_user_id = token_payload.get('sub')

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id FROM users WHERE cognito_id = %s", (cognito_user_id,))
        db_user = cur.fetchone()
        if not db_user:
            return cors_response(404, "User not found")
        user_id = db_user['id']

        try:
            # Get content type from front and check for responding boundary
            content_type = event['headers'].get('Content-Type', '')

            # if content type is not directly provided, try to extract it from headers
            if not content_type:
                for header_key in event['headers']:
                    if header_key.lower() == 'content-type':
                        content_type = event['headers'][header_key]
                        break

            print(f"Detected Content-Type: {content_type}")

            if 'multipart/form-data' not in content_type.lower():
                return cors_response(400, "Content-Type must be multipart/form-data")
                
            #extract boundary with flexible pattern matching
            boundary = None
            if 'boundary=' in content_type:
                boundary = content_type.split('boundary=')[1].strip()
                #remove quotes if present
                if boundary.startswith('"') and boundary.endswith('"'):
                    boundary = boundary[1:-1]
                elif boundary.startswith("'") and boundary.endswith("'"):
                    boundary = boundary[1:-1]
            else:
                #alternative boundary detection
                parts = content_type.split(';')
                for part in parts:
                    if 'boundary' in part.lower():
                        boundary = part.split('=')[1].strip()
                        #remove quotes if present
                        if boundary.startswith('"') and boundary.endswith('"'):
                            boundary = boundary[1:-1]
                        elif boundary.startswith("'") and boundary.endswith("'"):
                            boundary = boundary[1:-1]
                        break
            
            #if boundary is still not found, try to detect it from the body
            if not boundary:
                body = event.get('body', '')
                if event.get('isBase64Encoded', False):
                    body = base64.b64decode(body)
                
                if isinstance(body, bytes):
                    body = body.decode('utf-8', errors='replace')
                
                #look for common boundary patterns
                boundary_matches = re.findall(r'--+[\w-]+', body[:1000])
                if boundary_matches:
                    boundary = boundary_matches[0][2:]  #remove leading --
                    print(f"Auto-detected boundary from body: {boundary}")
                    
            if not boundary:
                return cors_response(400, "Cannot detect boundary in the multipart request")
                
            print(f"Using boundary: {boundary}")

            #decode body if necessary
            body = event.get('body', '')
            if event.get('isBase64Encoded', False):
                body = base64.b64decode(body)
            
            if isinstance(body, bytes):
                body = body.decode('utf-8', errors='replace')

            #split by boundary
            boundary_pattern = f'--{boundary}'
            parts = body.split(boundary_pattern)
            
            file_content = None
            filename = None
            filetype = None

            print(f"Found {len(parts)} parts in the multipart request")
            
            #iterate over parts and extract file content, filename and filetype
            for i, part in enumerate(parts):
                part = part.strip()
                if not part or part == '--': 
                    continue
                    
                print(f"Processing part {i}: length={len(part)}")
                
                #check for content-disposition header to identify form fields
                if 'Content-Disposition:' not in part and 'content-disposition:' not in part:
                    continue
                
                #split part into headers and content
                if '\r\n\r\n' in part:
                    headers, content = part.split('\r\n\r\n', 1)
                elif '\n\n' in part:
                    headers, content = part.split('\n\n', 1)
                else:
                    print(f"Couldn't find header/content delimiter in part {i}")
                    continue
                
                #convert headers to lowercase for case-insensitive matching
                headers_lower = headers.lower()
                
                #extract field name from content-disposition
                if 'name="file"' in headers_lower or "name='file'" in headers_lower:
                    #for file data, handle potential binary content correctly
                    file_content = content
                    #if trailing boundary - remove it
                    if '--' in file_content:
                        file_content = file_content.split('--')[0]
                    
                    #convert to bytes
                    if isinstance(file_content, str):
                        file_content = file_content.encode('utf-8')
                        
                    print(f"Found file content of length: {len(file_content) if file_content else 0}")
                elif 'name="filename"' in headers_lower or "name='filename'" in headers_lower:
                    #extract filename, remove any trailing boundaries
                    filename = content.split('--')[0].strip()
                    print(f"Found filename: {filename}")
                elif 'name="filetype"' in headers_lower or "name='filetype'" in headers_lower:
                    #extract filetype, remove any trailing boundaries
                    filetype = content.split('--')[0].strip()
                    print(f"Found filetype: {filetype}")

            #validate required fields
            if not file_content:
                return cors_response(400, "No file content found in the request")
                
            if not filename:
                return cors_response(400, "Filename parameter is required")
                
            if not filetype:
                return cors_response(400, "Filetype parameter is required")

        except Exception as e:
            import traceback
            traceback_str = traceback.format_exc()
            print(f"Error parsing multipart data: {str(e)}\n{traceback_str}")
            return cors_response(400, f"Error processing file upload: {str(e)}")

        #generate unique filename
        unique_filename = f"{uuid.uuid4()}-{filename}"
        
        #initialize S3 client
        s3_client = boto3.client('s3')
        bucket_name = os.environ['S3_BUCKET_NAME']

        try:
            #upload to S3 bucket
            s3_response = s3_client.put_object(
                Bucket=bucket_name,
                Key=f"user-{user_id}/{unique_filename}",
                Body=file_content,
                ContentType=filetype
            )

            #insert file into database
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
            
# NEEDS TO BE FIXED ################################################################
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
        cognito_user_id = token_payload.get('sub')

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id FROM users WHERE cognito_id = %s", (cognito_user_id,))
        db_user = cur.fetchone()
        if not db_user:
            return cors_response(404, "User not found")
        user_id = db_user['id']

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
        cognito_user_id = token_payload.get('sub')

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id FROM users WHERE cognito_id = %s", (cognito_user_id,))
        db_user = cur.fetchone()
        if not db_user:
            return cors_response(404, "User not found")
        user_id = db_user['id']

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