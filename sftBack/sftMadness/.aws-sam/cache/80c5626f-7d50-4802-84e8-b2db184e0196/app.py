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
        if resource_path == '/customs' and http_method == 'POST':
            return setCustoms(event, context)
        elif resource_path == '/customs' and http_method == 'GET':
            return getCustoms(event, context)
        elif resource_path == '/customs' and http_method == 'PUT':
            return updateCustoms(event, context)
        elif resource_path == '/customs' and http_method == 'DELETE':
            return deleteCustoms(event, context)
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
#customs functions

def setCustoms(event, context):
    conn = None
    try:
        # Get user ID from path parameters
        # user_id = event['pathParameters'].get('userId')
        # if not user_id:
        #     return cors_response(400, "User ID is required")

        # Parse request body
        try:
            body = json.loads(event.get('body', {}))
        except json.JSONDecodeError as e:
            return cors_response(400, f"Invalid JSON: {str(e)}")

        # Get requester's ID from token for authorization
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

        # Extract customs information
        model_name = body.get('modelName')
        model_logo = body.get('modelLogo')
        introduction = body.get('introduction')
        friendliness = body.get('friendliness')
        formality = body.get('formality')
        accent = body.get('accent')
        instructions = body.get('instructions')

        # Validate required fields
        if not model_name:
            return cors_response(400, "Model name is required")

        # Validate numeric ranges
        if friendliness is not None and not (0 <= friendliness <= 100):
            return cors_response(400, "Friendliness must be between 0 and 100")
        if formality is not None and not (0 <= formality <= 100):
            return cors_response(400, "Formality must be between 0 and 100")

        # Check if customs already exist for this user
        cur.execute(
            "SELECT id FROM customs WHERE userId = %s",
            (user_id,)
        )
        existing = cur.fetchone()

        if existing:
            return cors_response(400, "Customs already exist for this user. Use PUT to update.")

        # Insert new customs
        insert_query = """
            INSERT INTO customs (
                userId, modelName, modelLogo, introduction,
                friendliness, formality, accent, instructions
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        cur.execute(insert_query, (
            user_id, model_name, model_logo, introduction,
            friendliness, formality, accent, instructions
        ))
        new_customs = cur.fetchone()
        
        conn.commit()
        
        return cors_response(201, {"customs": new_customs})

    except Exception as e:
        if conn:
            conn.rollback()
        return cors_response(500, f"Error setting customs: {str(e)}")
    finally:
        if conn:
            conn.close()

def getCustoms(event, context):
    conn = None
    try:
    #     # Get user ID from path parameters
    #     user_id = event['pathParameters'].get('userId')
    #     if not user_id:
    #         return cors_response(400, "User ID is required")

        # Get requester's ID from token for authorization
        auth_header = event.get('headers', {}).get('Authorization')
        token = auth_header.split(' ')[-1]
        token_payload = verify_token(token)
        cognito_user_id = token_payload.get('sub')

        # Anyone can view customs, no authorization needed
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id FROM users WHERE cognito_id = %s", (cognito_user_id,))
        db_user = cur.fetchone()
        if not db_user:
            return cors_response(404, "User not found")
        user_id = db_user['id']

        # Get customs with user information
        query = """
            SELECT c.*, u.email, u.role, u.companyName
            FROM customs c
            JOIN users u ON c.userId = u.id
            WHERE c.userId = %s
        """
        cur.execute(query, (user_id,))
        customs = cur.fetchone()

        if not customs:
            return cors_response(404, "Customs not found")

        return cors_response(200, {"customs": customs})

    except Exception as e:
        return cors_response(500, f"Error retrieving customs: {str(e)}")
    finally:
        if conn:
            conn.close()

def updateCustoms(event, context):
    conn = None
    try:
        # Get user ID from path parameters
        # user_id = event['pathParameters'].get('userId')
        # if not user_id:
        #     return cors_response(400, "User ID is required")

        # Parse request body
        try:
            body = json.loads(event.get('body', {}))
        except json.JSONDecodeError as e:
            return cors_response(400, f"Invalid JSON: {str(e)}")

        # Get requester's ID from token for authorization
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

        # # Verify authorization
        # if str(requester_id) != str(user_id):
        #     return cors_response(403, "Unauthorized to update customs for this user")

        # Extract updateable fields
        updateable_fields = {
            'modelName': body.get('modelName'),
            'modelLogo': body.get('modelLogo'),
            'introduction': body.get('introduction'),
            'friendliness': body.get('friendliness'),
            'formality': body.get('formality'),
            'accent': body.get('accent'),
            'instructions': body.get('instructions')
        }

        # Remove None values
        update_fields = {k: v for k, v in updateable_fields.items() if v is not None}

        if not update_fields:
            return cors_response(400, "No valid fields to update")

        # Validate numeric ranges
        if 'friendliness' in update_fields and not (0 <= update_fields['friendliness'] <= 100):
            return cors_response(400, "Friendliness must be between 0 and 100")
        if 'formality' in update_fields and not (0 <= update_fields['formality'] <= 100):
            return cors_response(400, "Formality must be between 0 and 100")

        # Verify customs exist
        cur.execute(
            "SELECT id FROM customs WHERE userId = %s",
            (user_id,)
        )
        if not cur.fetchone():
            return cors_response(404, "Customs not found")

        # Construct UPDATE query dynamically
        set_clause = ", ".join([f"{k} = %s" for k in update_fields.keys()])
        values = list(update_fields.values()) + [user_id]

        update_query = f"""
            UPDATE customs 
            SET {set_clause}
            WHERE userId = %s
            RETURNING *
        """

        cur.execute(update_query, values)
        updated_customs = cur.fetchone()
        
        conn.commit()

        return cors_response(200, {"customs": updated_customs})

    except Exception as e:
        if conn:
            conn.rollback()
        return cors_response(500, f"Error updating customs: {str(e)}")
    finally:
        if conn:
            conn.close()

def deleteCustoms(event, context):
    conn = None
    try:
        # # Get user ID from path parameters
        # user_id = event['pathParameters'].get('userId')
        # if not user_id:
        #     return cors_response(400, "User ID is required")

        # Get requester's ID from token for authorization
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

        # # Verify authorization
        # if str(requester_id) != str(user_id):
        #     return cors_response(403, "Unauthorized to delete customs for this user")

        # Delete customs
        delete_query = """
            DELETE FROM customs 
            WHERE userId = %s
            RETURNING id
        """
        cur.execute(delete_query, (user_id,))
        deleted = cur.fetchone()

        if not deleted:
            return cors_response(404, "Customs not found")

        conn.commit()

        return cors_response(200, {
            "message": "Customs deleted successfully",
            "userId": user_id
        })

    except Exception as e:
        if conn:
            conn.rollback()
        return cors_response(500, f"Error deleting customs: {str(e)}")
    finally:
        if conn:
            conn.close()