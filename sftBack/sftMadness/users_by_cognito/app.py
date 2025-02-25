import json
import os
import psycopg2
from datetime import datetime, date
import boto3
import jwt
from botocore.exceptions import ClientError
from psycopg2.extras import RealDictCursor
import requests
from jwt import algorithms

# cors_response function to return API Gateway response with CORS headers
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

# Database connection function
def get_db_connection():
    return psycopg2.connect(
        dbname=os.environ['DB_NAME'],
        host=os.environ['DB_HOST'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        port=os.environ['DB_PORT'],
        connect_timeout=5)

# Lambda handler for the new getUserByCognitoId function
def lambda_handler(event, context):
    if event['httpMethod'] == 'OPTIONS':
        return cors_response(200, "ok")
    
    print(f"Event received in getUserByCognitoId: {json.dumps(event)}")
    
    # Authenticate the request
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
    
    # Get the Cognito ID from path parameters
    cognito_id = event['pathParameters'].get('cognitoId')
    
    if not cognito_id:
        return cors_response(400, "Cognito ID is required")
    
    print(f"Looking up user with Cognito ID: {cognito_id}")
    
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Query to find user by cognito_id
        user_query = """
            SELECT id, email, role, companyName, phoneNumber, joinDate, cognito_id 
            FROM users 
            WHERE cognito_id = %s"""
        cur.execute(user_query, (cognito_id,))
        user = cur.fetchone()
        
        if not user:
            return cors_response(404, {"error": "User not found"})
        
        print(f"Found user: {json.dumps(dict(user), default=str)}")
        
        return cors_response(200, {"user": user})
        
    except Exception as e:
        print(f"Error in getUserByCognitoId: {str(e)}")
        return cors_response(500, {"error": f"Database error: {str(e)}"})
    finally:
        if conn:
            conn.close()

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