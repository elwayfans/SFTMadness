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

s3 = boto3.client('s3')
BUCKET_NAME = os.environ.get('S3_SCRAPED_BUCKET_NAME')

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
        if resource_path == '/scrapedFiles' and http_method == 'POST':
            return uploadFile(event, context)
        elif resource_path == '/scrapedFiles/{fileId}' and http_method == 'GET':
            return getFile(event, context)
        elif resource_path == '/scrapedFiles/{fileId}' and http_method == 'DELETE':
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
#scrapedFiles functions
def uploadFile(event, context):
    conn = None
    try:
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
            content_type = event['headers'].get('Content-Type', '')

            if not content_type:
                for header_key in event['headers']:
                    if header_key.lower() == 'content-type':
                        content_type = event['headers'][header_key]
                        break

            print(f"Detected Content-Type: {content_type}")

            if 'multipart/form-data' not in content_type.lower():
                return cors_response(400, "Content-Type must be multipart/form-data")
                
            boundary = None
            if 'boundary=' in content_type:
                boundary = content_type.split('boundary=')[1].strip()
                if boundary.startswith('"') and boundary.endswith('"'):
                    boundary = boundary[1:-1]
                elif boundary.startswith("'") and boundary.endswith("'"):
                    boundary = boundary[1:-1]
            else:
                parts = content_type.split(';')
                for part in parts:
                    if 'boundary' in part.lower():
                        boundary = part.split('=')[1].strip()
                        if boundary.startswith('"') and boundary.endswith('"'):
                            boundary = boundary[1:-1]
                        elif boundary.startswith("'") and boundary.endswith("'"):
                            boundary = boundary[1:-1]
                        break
            
            # Get the body content
            body = event.get('body', '')
            if event.get('isBase64Encoded', False):
                body_content = base64.b64decode(body)
            else:
                body_content = body.encode('utf-8') if isinstance(body, str) else body
            
            if not boundary:
                boundary_matches = re.findall(r'--+[\w-]+', body_content[:1000].decode('utf-8', errors='replace'))
                if boundary_matches:
                    boundary = boundary_matches[0][2:]
                    print(f"Auto-detected boundary from body: {boundary}")
                    
            if not boundary:
                return cors_response(400, "Cannot detect boundary in the multipart request")
                
            print(f"Using boundary: {boundary}")

            # Convert body_content to string for parsing if it's bytes
            if isinstance(body_content, bytes):
                body_str = body_content.decode('utf-8', errors='replace')
            else:
                body_str = body_content

            boundary_pattern = f'--{boundary}'
            parts = body_str.split(boundary_pattern)
            
            model = None
            file_data = None
            filename = None
            filetype = None

            print(f"Found {len(parts)} parts in the multipart request")
            
            for i, part in enumerate(parts):
                part = part.strip()
                if not part or part == '--': 
                    continue
                    
                print(f"Processing part {i}: length={len(part)}")
                
                if 'Content-Disposition:' not in part and 'content-disposition:' not in part:
                    continue
                
                if '\r\n\r\n' in part:
                    headers, content = part.split('\r\n\r\n', 1)
                elif '\n\n' in part:
                    headers, content = part.split('\n\n', 1)
                else:
                    print(f"Couldn't find header/content delimiter in part {i}")
                    continue
                
                headers_lower = headers.lower()
                
                if 'name="file"' in headers_lower or "name='file'" in headers_lower:
                    file_data = content
                    if '--' in file_data:
                        file_data = file_data.split('--')[0]
                    
                    # Keep file_data as string for now
                    print(f"Found file content of length: {len(file_data) if file_data else 0}")
                elif 'name="model"' in headers_lower or "name='model'" in headers_lower:
                    model = content.split('--')[0].strip()
                    print(f"Found model: {model}")
                elif 'name="filename"' in headers_lower or "name='filename'" in headers_lower:
                    filename = content.split('--')[0].strip()
                    print(f"Found filename: {filename}")
                elif 'name="filetype"' in headers_lower or "name='filetype'" in headers_lower:
                    filetype = content.split('--')[0].strip()
                    print(f"Found filetype: {filetype}")

            if not model:
                return cors_response(400, "Model parameter is required")

            if not file_data:
                return cors_response(400, "No file content found in the request")
                
            if not filename:
                return cors_response(400, "Filename parameter is required")
                
            if not filetype:
                filetype = "application/octet-stream"  # Default if not provided
                print(f"Using default filetype: {filetype}")

            # Convert file_data to bytes for S3 upload if it's a string
            if isinstance(file_data, str):
                file_data_bytes = file_data.encode('utf-8')
            else:
                file_data_bytes = file_data

        except Exception as e:
            import traceback
            traceback_str = traceback.format_exc()
            print(f"Error parsing multipart data: {str(e)}\n{traceback_str}")
            return cors_response(400, f"Error processing file upload: {str(e)}")

        unique_filename = f"{uuid.uuid4()}-{filename}"
        filepath = f"user-{user_id}/{unique_filename}"

        try:
            s3_response = s3.put_object(
                Bucket=BUCKET_NAME,
                Key=filepath,  # Use the path you defined for S3
                Body=file_data_bytes,
                ContentType=filetype
            )

            insert_query = """
                INSERT INTO scrapedFiles (userId, model, filename, filepath, filetype)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, userId, model, filename, filepath, filetype, uploadDate
            """
            cur.execute(insert_query, (user_id, model, filename, filepath, filetype))
            file_record = cur.fetchone()
            
            conn.commit()

            return cors_response(201, {
                "message": "File uploaded successfully",
                "file": file_record
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
        # Handle OPTIONS request for CORS
        if event['httpMethod'] == 'OPTIONS':
            return cors_response(200, "ok")
            
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
            "SELECT * FROM scrapedFiles WHERE id = %s AND userId = %s",
            (file_id, user_id)
        )
        file_record = cur.fetchone()

        if not file_record:
            return cors_response(404, "File not found or unauthorized access")

        try:
            # Print filepath to help with debugging
            print(f"Attempting to retrieve file from S3: {file_record['filepath']}")
            
            # Get the actual file content from S3
            response = s3.get_object(
                Bucket=BUCKET_NAME,
                Key=file_record['filepath']
            )
            
            s3_content_type = response.get('ContentType', 'application/octet-stream')
            print(f"db content type: {file_record['filetype']}")
            content_type = file_record['filetype'] or s3_content_type
            print(f"Using content type: {content_type}")
            
            file_content = response['Body'].read()
            print(f"File content length: {len(file_content)} bytes")
            
            # Default headers for all responses
            common_headers = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE,HEAD',
                'Content-Disposition': f'attachment; filename="{file_record["filename"]}"'
            }
            
            # Use JSON response with base64 encoding for all files for consistency
            # This ensures API Gateway can handle the response properly
            encoded_content = base64.b64encode(file_content).decode('utf-8')
            
            response_body = {
                'id': file_record['id'],
                'filename': file_record['filename'],
                'filetype': content_type,
                'content': encoded_content,
                'size': len(file_content)
            }
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    **common_headers
                },
                'body': json.dumps(response_body, default=str),
                'isBase64Encoded': False
            }

        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            error_message = e.response.get('Error', {}).get('Message', str(e))
            print(f"S3 ClientError: {error_code} - {error_message}")
            return cors_response(500, f"Error retrieving file from S3: {error_code} - {error_message}")
        except Exception as e:
            print(f"Unexpected error when retrieving file content: {str(e)}")
            return cors_response(500, f"Error retrieving file content: {str(e)}")

    except Exception as e:
        print(f"Error in getFile handler: {str(e)}")
        return cors_response(500, f"Error retrieving file: {str(e)}")
    finally:
        if conn:
            conn.close()

def deleteFile(event, context):
    conn = None
    try:
        file_id = event['pathParameters'].get('fileId')
        if not file_id:
            return cors_response(400, "File ID is required")

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

        cur.execute(
            "SELECT filepath FROM scrapedFiles WHERE id = %s AND userId = %s",
            (file_id, user_id)
        )
        file_record = cur.fetchone()

        if not file_record:
            return cors_response(404, "File not found or unauthorized access")

        s3_client = boto3.client('s3')
        bucket_name = os.environ['S3_SCRAPED_BUCKET_NAME']

        try:
            s3_client.delete_object(
                Bucket=bucket_name,
                Key=file_record['filepath']
            )

            cur.execute(
                "DELETE FROM scrapedFiles WHERE id = %s AND userId = %s RETURNING id",
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