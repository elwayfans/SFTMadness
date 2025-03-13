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
        if resource_path == '/conversation_logs' and http_method == 'POST':
            return logConversation(event, context)
        elif resource_path == '/conversation_logs/{userId}' and http_method == 'GET':
            return getConversationLogs(event, context)
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
#conversation_logs functions

def logConversation(event, context):
    conn = None
    try:
        # Parse request body
        try:
            body = json.loads(event.get('body', {}))
        except json.JSONDecodeError as e:
            return cors_response(400, f"Invalid JSON: {str(e)}")

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

        # Extract conversation log information
        contact_id = body.get('contactId')
        interaction_type = body.get('interactionType')
        subject = body.get('subject')
        content = body.get('content')

        # Validate required fields
        if not all([contact_id, interaction_type]):
            return cors_response(400, "Missing required fields: contactId and interactionType are required")

        # Verify contact exists and belongs to user
        cur.execute(
            "SELECT id FROM schoolContact WHERE id = %s AND userId = %s",
            (contact_id, user_id)
        )
        if not cur.fetchone():
            return cors_response(404, "School contact not found or unauthorized access")

        # Insert conversation log
        insert_query = """
            INSERT INTO conversationLogs (
                userId, contactId, interactionType, subject, content
            )
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, userId, contactId, interactionType, subject, content, timestamp
        """
        cur.execute(insert_query, (
            user_id, contact_id, interaction_type, subject, content
        ))
        new_log = cur.fetchone()
        
        conn.commit()
        
        return cors_response(201, {
            "message": "Conversation logged successfully",
            "log": new_log
        })

    except Exception as e:
        if conn:
            conn.rollback()
        return cors_response(500, f"Error logging conversation: {str(e)}")
    finally:
        if conn:
            conn.close()

def getConversationLogs(event, context):
    conn = None
    try:
        # Get path and query parameters
        user_id = event['pathParameters'].get('userId')
        if not user_id:
            return cors_response(400, "User ID is required")

        query_params = event.get('queryStringParameters', {}) or {}
        contact_id = query_params.get('contactId')
        interaction_type = query_params.get('interactionType')
        start_date = query_params.get('startDate')
        end_date = query_params.get('endDate')
        limit = query_params.get('limit', '50')  # Default to 50 logs
        offset = query_params.get('offset', '0')  # Default to first page

        # Get requester's user ID from token
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
        requester_db_id = str(db_user['id'])

        # Verify requester has permission to view these logs
        if str(requester_db_id) != str(user_id):
            return cors_response(403, "Unauthorized to view these conversation logs")

        # Build query with filters
        query = """
            SELECT 
                cl.*,
                json_build_object(
                    'id', sc.id,
                    'email', sc.email,
                    'phoneNumber', sc.phoneNumber
                ) as contact
            FROM conversationLogs cl
            JOIN schoolContact sc ON cl.contactId = sc.id
            WHERE cl.userId = %s
        """
        params = [user_id]

        if contact_id:
            query += " AND cl.contactId = %s"
            params.append(contact_id)
        if interaction_type:
            query += " AND cl.interactionType = %s"
            params.append(interaction_type)
        if start_date:
            query += " AND cl.timestamp >= %s"
            params.append(start_date)
        if end_date:
            query += " AND cl.timestamp <= %s"
            params.append(end_date)

        # Add sorting
        query += " ORDER BY cl.timestamp DESC"

        # Add pagination
        query += " LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        # Get total count for pagination
        count_query = """
            SELECT COUNT(*) 
            FROM conversationLogs 
            WHERE userId = %s
        """
        count_params = [user_id]

        if contact_id:
            count_query += " AND contactId = %s"
            count_params.append(contact_id)
        if interaction_type:
            count_query += " AND interactionType = %s"
            count_params.append(interaction_type)
        if start_date:
            count_query += " AND timestamp >= %s"
            count_params.append(start_date)
        if end_date:
            count_query += " AND timestamp <= %s"
            count_params.append(end_date)

        # Execute queries
        cur.execute(count_query, count_params)
        total_count = cur.fetchone()['count']

        cur.execute(query, params)
        logs = cur.fetchall()

        return cors_response(200, {
            "logs": logs,
            "pagination": {
                "total": total_count,
                "offset": int(offset),
                "limit": int(limit),
                "hasMore": (int(offset) + int(limit)) < total_count
            }
        })

    except Exception as e:
        return cors_response(500, f"Error retrieving conversation logs: {str(e)}")
    finally:
        if conn:
            conn.close()