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
        if resource_path == '/contact' and http_method == 'POST':
            return createContact(event, context)
        elif resource_path == '/contact/{contactId}' and http_method == 'GET':
            return getContactById(event, context)
        elif resource_path == '/contact/{contactId}' and http_method == 'PUT':
            return updateContact(event, context)
        elif resource_path == '/contact/{contactId}' and http_method == 'DELETE':
            return deleteContact(event, context)
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
#contact functions

def createContact(event, context):
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

        # Extract contact information
        email = body.get('email')
        phone_number = body.get('phoneNumber')

        if not email and not phone_number:
            return cors_response(400, "Either email or phone number is required")

        # Insert new contact
        insert_query = """
            INSERT INTO schoolContact (userId, email, phoneNumber)
            VALUES (%s, %s, %s)
            RETURNING id, userId, email, phoneNumber, createdAt
        """
        cur.execute(insert_query, (user_id, email, phone_number))
        new_contact = cur.fetchone()
        
        conn.commit()
        
        return cors_response(201, {"contact": new_contact})

    except Exception as e:
        if conn:
            conn.rollback()
        return cors_response(500, f"Error creating contact: {str(e)}")
    finally:
        if conn:
            conn.close()

def getContactById(event, context):
    conn = None
    try:
        # Get contact ID from path parameters
        contact_id = event['pathParameters'].get('contactId')
        if not contact_id:
            return cors_response(400, "Contact ID is required")

        # Get user ID from token for authorization
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

        # Get contact details with associated events and conversation logs
        query = """
            SELECT 
                sc.id,
                sc.userId,
                sc.email,
                sc.phoneNumber,
                sc.createdAt,
                json_agg(DISTINCT e.*) FILTER (WHERE e.id IS NOT NULL) as events,
                json_agg(DISTINCT cl.*) FILTER (WHERE cl.id IS NOT NULL) as conversation_logs
            FROM schoolContact sc
            LEFT JOIN events e ON sc.id = e.contactId
            LEFT JOIN conversationLogs cl ON sc.id = cl.contactId
            WHERE sc.id = %s AND sc.userId = %s
            GROUP BY sc.id
        """
        cur.execute(query, (contact_id, user_id))
        contact = cur.fetchone()

        if not contact:
            return cors_response(404, "Contact not found or unauthorized access")

        return cors_response(200, {"contact": contact})

    except Exception as e:
        return cors_response(500, f"Error retrieving contact: {str(e)}")
    finally:
        if conn:
            conn.close()

def updateContact(event, context):
    conn = None
    try:
        # Get contact ID from path parameters
        contact_id = event['pathParameters'].get('contactId')
        if not contact_id:
            return cors_response(400, "Contact ID is required")

        # Parse request body
        try:
            body = json.loads(event.get('body', {}))
        except json.JSONDecodeError as e:
            return cors_response(400, f"Invalid JSON: {str(e)}")

        # Get user ID from token for authorization
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

        # Extract updateable fields
        updateable_fields = {
            'email': body.get('email'),
            'phoneNumber': body.get('phoneNumber')
        }

        # Remove None values
        update_fields = {k: v for k, v in updateable_fields.items() if v is not None}

        if not update_fields:
            return cors_response(400, "No valid fields to update")

        # Verify ownership
        cur.execute(
            "SELECT id FROM schoolContact WHERE id = %s AND userId = %s",
            (contact_id, user_id)
        )
        if not cur.fetchone():
            return cors_response(404, "Contact not found or unauthorized access")

        # Construct UPDATE query dynamically
        set_clause = ", ".join([f"{k} = %s" for k in update_fields.keys()])
        values = list(update_fields.values()) + [contact_id, user_id]

        update_query = f"""
            UPDATE schoolContact 
            SET {set_clause}
            WHERE id = %s AND userId = %s
            RETURNING id, userId, email, phoneNumber, createdAt
        """

        cur.execute(update_query, values)
        updated_contact = cur.fetchone()
        
        conn.commit()

        return cors_response(200, {"contact": updated_contact})

    except Exception as e:
        if conn:
            conn.rollback()
        return cors_response(500, f"Error updating contact: {str(e)}")
    finally:
        if conn:
            conn.close()

def deleteContact(event, context):
    conn = None
    try:
        # Get contact ID from path parameters
        contact_id = event['pathParameters'].get('contactId')
        if not contact_id:
            return cors_response(400, "Contact ID is required")

        # Get user ID from token for authorization
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

        # Delete contact (cascade will handle related records)
        delete_query = """
            DELETE FROM schoolContact 
            WHERE id = %s AND userId = %s
            RETURNING id
        """
        cur.execute(delete_query, (contact_id, user_id))
        deleted = cur.fetchone()

        if not deleted:
            return cors_response(404, "Contact not found or unauthorized access")

        conn.commit()

        return cors_response(200, {
            "message": "Contact deleted successfully",
            "contactId": contact_id
        })

    except Exception as e:
        if conn:
            conn.rollback()
        return cors_response(500, f"Error deleting contact: {str(e)}")
    finally:
        if conn:
            conn.close()