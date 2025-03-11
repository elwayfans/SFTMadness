import json
import boto3
import os
import requests
import jwt
from jwt import algorithms
from botocore.exceptions import ClientError
import psycopg2
from datetime import datetime

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

def verify_token(token, token_type="id"):
    """Verify the JWT token and check if it's been invalidated"""
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

    try:
        # Verify the token
        payload = jwt.decode(
            token,
            public_key,
            algorithms=['RS256'],
            audience=os.environ['COGNITO_CLIENT_ID']
        )
        
        # Check if token has been invalidated
        if is_token_invalidated(payload):
            raise Exception('Token has been invalidated')
            
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception('Token has expired')
    except jwt.InvalidTokenError:
        raise Exception('Invalid token')

############################################
def get_db_connection():
    return psycopg2.connect(
        dbname=os.environ['DB_NAME'],
        host=os.environ['DB_HOST'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        port=os.environ['DB_PORT'],

        connect_timeout=5)

def invalidate_token(token_payload, user_id, token_type="id"):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            jti = token_payload.get('jti')
            exp = token_payload.get('exp')
            
            if not jti or not exp:
                raise Exception("Token missing required claims (jti or exp)")
            
            # Convert Unix timestamp to datetime
            expires_at = datetime.fromtimestamp(exp)
            
            cur.execute("""
                INSERT INTO invalidated_tokens (jti, user_id, expires_at, token_type)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (jti) DO UPDATE
                SET invalidated_at = CURRENT_TIMESTAMP
            """, (jti, user_id, expires_at, token_type))
            conn.commit()

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

def get_user_id_from_cognito_id(cognito_id):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id 
                FROM users 
                WHERE cognito_id = %s
            """, (cognito_id,))
            result = cur.fetchone()
            if result:
                return result[0]
            return None
        
############################################
# handler
def logout_handler(event, context):
    if event['httpMethod'] == 'OPTIONS':
        return cors_response(200, "ok")
    
    try:
        # Get the access token from Authorization header
        auth_header = event.get('headers', {}).get('Authorization')
        if not auth_header:
            return cors_response(401, "No authorization token provided")

        if not auth_header.startswith('Bearer '):
            return cors_response(401, "Invalid authorization header format. Must start with 'Bearer'")

        id_token = auth_header.replace('Bearer ', '')

        try:
            # Verify ID token
            id_token_payload = verify_token(id_token, "id")
            
            cognito_sub = id_token_payload.get('sub')
            if not cognito_sub:
                return cors_response(400, "Could not get user ID from token")

            user_id = get_user_id_from_cognito_id(cognito_sub)
            if not user_id:
                return cors_response(404, "User not found in database")

            email = id_token_payload.get('email')
            if not email:
                return cors_response(400, "Could not get email from token")

            cognito_client = boto3.client('cognito-idp')

            try:
                # Sign out globally
                cognito_client.admin_user_global_sign_out(
                    UserPoolId=os.environ['COGNITO_USER_POOL_ID'],
                    Username=email
                )
                
                # Invalidate ID token
                invalidate_token(id_token_payload, user_id, "id")

                # Log the action
                with get_db_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute("""
                            INSERT INTO admin_logs (adminId, actionType, targetId, details)
                            VALUES (%s, %s, %s, %s)
                        """, (user_id, 'LOGOUT', user_id, 'User logged out globally'))
                        conn.commit()

                return cors_response(200, {
                    "message": "Logout successful",
                    "status": "success"
                })

            except cognito_client.exceptions.UserNotFoundException:
                return cors_response(404, "User not found in Cognito")
            except ClientError as e:
                return cors_response(500, f"Logout error: {str(e)}")

        except Exception as e:
            print("Token verification error:", str(e))
            return cors_response(401, f"Invalid token: {str(e)}")

    except Exception as e:
        print("General error:", str(e))
        return cors_response(500, f"Internal server error: {str(e)}")