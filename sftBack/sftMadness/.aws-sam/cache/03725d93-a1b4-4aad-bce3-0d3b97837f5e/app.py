import json
import os
import psycopg2
from datetime import datetime, date
import boto3
# import base64
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
        if resource_path == '/sftEvents' and http_method == 'POST':
            return scheduleEvent(event, context)
        elif resource_path == '/sftEvents/{eventId}' and http_method == 'GET':
            return getEventById(event, context)
        elif resource_path == '/sftEvents' and http_method == 'GET':
            return getEvents(event, context)
        elif resource_path == '/sftEvents/{eventId}' and http_method == 'PUT':
            return updateEvent(event, context)
        elif resource_path == '/sftEvents/{eventId}' and http_method == 'DELETE':
            return deleteEvent(event, context)
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
#sftEvents functions

def scheduleEvent(event, context):
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

        # Extract event information
        contact_id = body.get('contactId')
        subject = body.get('subject')
        event_type = body.get('type')
        attendees = body.get('attendees')
        scheduled_date = body.get('scheduledDate')

        # Validate required fields
        if not all([contact_id, subject, event_type, scheduled_date]):
            return cors_response(400, "Missing required fields")

        # Verify contact exists and belongs to user
        cur.execute(
            "SELECT id FROM schoolContact WHERE id = %s AND userId = %s",
            (contact_id, user_id)
        )
        if not cur.fetchone():
            return cors_response(404, "School contact not found or unauthorized access")

        # Insert new event
        insert_query = """
            INSERT INTO events (
                contactId, userId, subject, type, attendees, 
                scheduledDate, status
            )
            VALUES (%s, %s, %s, %s, %s, %s, 'pending')
            RETURNING *
        """
        cur.execute(insert_query, (
            contact_id, user_id, subject, event_type,
            attendees, scheduled_date
        ))
        new_event = cur.fetchone()
        
        conn.commit()
        
        return cors_response(201, {"event": new_event})

    except Exception as e:
        if conn:
            conn.rollback()
        return cors_response(500, f"Error scheduling event: {str(e)}")
    finally:
        if conn:
            conn.close()

def getEventById(event, context):
    conn = None
    try:
        # Get event ID from path parameters
        event_id = event['pathParameters'].get('eventId')
        if not event_id:
            return cors_response(400, "Event ID is required")

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

        # Get event details with contact information
        query = """
            SELECT 
                e.*,
                json_build_object(
                    'id', sc.id,
                    'email', sc.email,
                    'phoneNumber', sc.phoneNumber
                ) as contact
            FROM events e
            JOIN schoolContact sc ON e.contactId = sc.id
            WHERE e.id = %s AND e.userId = %s
        """
        cur.execute(query, (event_id, user_id))
        event_data = cur.fetchone()

        if not event_data:
            return cors_response(404, "Event not found or unauthorized access")

        return cors_response(200, {"event": event_data})

    except Exception as e:
        return cors_response(500, f"Error retrieving event: {str(e)}")
    finally:
        if conn:
            conn.close()

def getEvents(event, context):
    conn = None
    try:
        # Get user ID from token
        auth_header = event.get('headers', {}).get('Authorization')
        token = auth_header.split(' ')[-1]
        token_payload = verify_token(token)
        cognito_user_id = token_payload.get('sub')

        # Get query parameters for filtering
        query_params = event.get('queryStringParameters', {}) or {}
        status = query_params.get('status')
        contact_id = query_params.get('contactId')
        start_date = query_params.get('startDate')
        end_date = query_params.get('endDate')

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id FROM users WHERE cognito_id = %s", (cognito_user_id,))
        db_user = cur.fetchone()
        if not db_user:
            return cors_response(404, "User not found")
        user_id = db_user['id']

        # Build query with filters
        query = """
            SELECT 
                e.*,
                json_build_object(
                    'id', sc.id,
                    'email', sc.email,
                    'phoneNumber', sc.phoneNumber
                ) as contact
            FROM events e
            JOIN schoolContact sc ON e.contactId = sc.id
            WHERE e.userId = %s
        """
        params = [user_id]

        if status:
            query += " AND e.status = %s"
            params.append(status)
        if contact_id:
            query += " AND e.contactId = %s"
            params.append(contact_id)
        if start_date:
            query += " AND e.scheduledDate >= %s"
            params.append(start_date)
        if end_date:
            query += " AND e.scheduledDate <= %s"
            params.append(end_date)

        query += " ORDER BY e.scheduledDate DESC"

        cur.execute(query, params)
        events = cur.fetchall()

        return cors_response(200, {"events": events})

    except Exception as e:
        return cors_response(500, f"Error retrieving events: {str(e)}")
    finally:
        if conn:
            conn.close()

def updateEvent(event, context):
    conn = None
    try:
        # Get event ID from path parameters
        event_id = event['pathParameters'].get('eventId')
        if not event_id:
            return cors_response(400, "Event ID is required")

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

        # Extract updateable fields
        updateable_fields = {
            'subject': body.get('subject'),
            'type': body.get('type'),
            'attendees': body.get('attendees'),
            'scheduledDate': body.get('scheduledDate'),
            'status': body.get('status')
        }

        # Remove None values
        update_fields = {k: v for k, v in updateable_fields.items() if v is not None}

        if not update_fields:
            return cors_response(400, "No valid fields to update")

        # Validate status if being updated
        if 'status' in update_fields and update_fields['status'] not in [
            'pending', 'accepted', 'denied', 'completed'
        ]:
            return cors_response(400, "Invalid status value")

        # Verify event ownership
        cur.execute(
            "SELECT id FROM events WHERE id = %s AND userId = %s",
            (event_id, user_id)
        )
        if not cur.fetchone():
            return cors_response(404, "Event not found or unauthorized access")

        # Construct UPDATE query dynamically
        set_clause = ", ".join([f"{k} = %s" for k in update_fields.keys()])
        values = list(update_fields.values()) + [event_id, user_id]

        update_query = f"""
            UPDATE events 
            SET {set_clause}
            WHERE id = %s AND userId = %s
            RETURNING *
        """

        cur.execute(update_query, values)
        updated_event = cur.fetchone()
        
        conn.commit()

        return cors_response(200, {"event": updated_event})

    except Exception as e:
        if conn:
            conn.rollback()
        return cors_response(500, f"Error updating event: {str(e)}")
    finally:
        if conn:
            conn.close()

def deleteEvent(event, context):
    conn = None
    try:
        # Get event ID from path parameters
        event_id = event['pathParameters'].get('eventId')
        if not event_id:
            return cors_response(400, "Event ID is required")

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

        # Delete event
        delete_query = """
            DELETE FROM events 
            WHERE id = %s AND userId = %s
            RETURNING id
        """
        cur.execute(delete_query, (event_id, user_id))
        deleted = cur.fetchone()

        if not deleted:
            return cors_response(404, "Event not found or unauthorized access")

        conn.commit()

        return cors_response(200, {
            "message": "Event deleted successfully",
            "eventId": event_id
        })

    except Exception as e:
        if conn:
            conn.rollback()
        return cors_response(500, f"Error deleting event: {str(e)}")
    finally:
        if conn:
            conn.close()