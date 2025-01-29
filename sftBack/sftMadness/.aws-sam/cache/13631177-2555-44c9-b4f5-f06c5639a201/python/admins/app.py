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
        if resource_path == '/admins' and http_method == 'POST':
            return createAdmin(event, context)
        elif resource_path == '/admins/{userId}' and http_method == 'GET':
            return getUserById(event, context)
        elif resource_path == '/admins' and http_method == 'GET':
            return getUsers(event, context)
        elif resource_path == '/admins/{userId}' and http_method == 'DELETE':
            return deleteUser(event, context)
        elif resource_path == '/admins/log' and http_method == 'POST':
            return logAction(event, context)
        elif resource_path == '/admins/log/{userId}' and http_method == 'GET':
            return getLogs(event, context)
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
#admins functions

def is_admin(token_payload, conn, cur):
    """Helper function to verify admin status"""
    user_email = token_payload.get('email')
    cur.execute("SELECT role FROM users WHERE email = %s", (user_email,))
    user = cur.fetchone()
    return user and user['role'] == 'admin'

def createAdmin(event, context):
    conn = None
    try:
        # Verify admin authorization
        auth_header = event.get('headers', {}).get('Authorization')
        token = auth_header.split(' ')[-1]
        token_payload = verify_token(token)

        # Parse request body
        try:
            body = json.loads(event.get('body', {}))
        except json.JSONDecodeError as e:
            return cors_response(400, f"Invalid JSON: {str(e)}")

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Verify requester is admin
        if not is_admin(token_payload, conn, cur):
            return cors_response(403, "Only administrators can create admin accounts")

        # Extract user information
        email = body.get('email')
        password = body.get('password')
        company_name = body.get('companyName')
        phone_number = body.get('phoneNumber')

        if not email or not password:
            return cors_response(400, "Email and password are required")

        # Create user in Cognito
        cognito_client = boto3.client('cognito-idp')
        try:
            cognito_response = cognito_client.admin_create_user(
                UserPoolId=os.environ['COGNITO_USER_POOL_ID'],
                Username=email,
                UserAttributes=[
                    {'Name': 'email', 'Value': email},
                    {'Name': 'email_verified', 'Value': 'true'}
                ],
                TemporaryPassword=password,
                MessageAction='SUPPRESS'
            )

            cognito_client.admin_set_user_password(
                UserPoolId=os.environ['COGNITO_USER_POOL_ID'],
                Username=email,
                Password=password,
                Permanent=True
            )

            # Create admin in database
            insert_query = """
                INSERT INTO users (email, password, role, companyName, phoneNumber, joinDate)
                VALUES (%s, %s, 'admin', %s, %s, CURRENT_TIMESTAMP)
                RETURNING id, email, role, companyName, phoneNumber, joinDate
            """
            cur.execute(insert_query, (email, password, company_name, phone_number))
            new_admin = cur.fetchone()
            
            # Log admin creation
            log_query = """
                INSERT INTO admin_logs (adminId, actionType, targetId, details)
                VALUES (%s, 'create_admin', %s, %s)
            """
            admin_id = token_payload.get('sub')
            cur.execute(log_query, (
                admin_id,
                new_admin['id'],
                f"Created admin account for {email}"
            ))
            
            conn.commit()

            return cors_response(201, {
                "message": "Admin created successfully",
                "admin": new_admin
            })

        except Exception as e:
            return cors_response(400, f"Error creating admin: {str(e)}")

    except Exception as e:
        if conn:
            conn.rollback()
        return cors_response(500, f"Error: {str(e)}")
    finally:
        if conn:
            conn.close()

def getUserById(event, context):
    conn = None
    try:
        # Verify admin authorization
        auth_header = event.get('headers', {}).get('Authorization')
        token = auth_header.split(' ')[-1]
        token_payload = verify_token(token)

        user_id = event['pathParameters'].get('userId')
        if not user_id:
            return cors_response(400, "User ID is required")

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Verify requester is admin
        if not is_admin(token_payload, conn, cur):
            return cors_response(403, "Admin access required")

        # Get user with associated data
        query = """
            SELECT 
                u.*,
                json_agg(DISTINCT e.*) FILTER (WHERE e.id IS NOT NULL) as events,
                json_agg(DISTINCT c.*) FILTER (WHERE c.id IS NOT NULL) as contacts,
                json_agg(DISTINCT f.*) FILTER (WHERE f.id IS NOT NULL) as files,
                (SELECT json_agg(cl.*) 
                 FROM conversationLogs cl 
                 WHERE cl.userId = u.id) as conversation_logs
            FROM users u
            LEFT JOIN events e ON u.id = e.userId
            LEFT JOIN schoolContact c ON u.id = c.userId
            LEFT JOIN files f ON u.id = f.userId
            WHERE u.id = %s
            GROUP BY u.id
        """
        cur.execute(query, (user_id,))
        user = cur.fetchone()

        if not user:
            return cors_response(404, "User not found")

        return cors_response(200, {"user": user})

    except Exception as e:
        return cors_response(500, f"Error: {str(e)}")
    finally:
        if conn:
            conn.close()

def getUsers(event, context):
    conn = None
    try:
        # Verify admin authorization
        auth_header = event.get('headers', {}).get('Authorization')
        token = auth_header.split(' ')[-1]
        token_payload = verify_token(token)

        # Get query parameters
        query_params = event.get('queryStringParameters', {}) or {}
        role = query_params.get('role')
        search = query_params.get('search')
        limit = int(query_params.get('limit', '50'))
        offset = int(query_params.get('offset', '0'))

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Verify requester is admin
        if not is_admin(token_payload, conn, cur):
            return cors_response(403, "Admin access required")

        # Build query
        query = """
            SELECT 
                u.*,
                COUNT(DISTINCT e.id) as event_count,
                COUNT(DISTINCT c.id) as contact_count,
                COUNT(DISTINCT f.id) as file_count
            FROM users u
            LEFT JOIN events e ON u.id = e.userId
            LEFT JOIN schoolContact c ON u.id = c.userId
            LEFT JOIN files f ON u.id = f.userId
        """
        where_clauses = []
        params = []

        if role:
            where_clauses.append("u.role = %s")
            params.append(role)

        if search:
            where_clauses.append("(u.email ILIKE %s OR u.companyName ILIKE %s)")
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern])

        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)

        query += """
            GROUP BY u.id
            ORDER BY u.joinDate DESC
            LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])

        # Get total count
        count_query = "SELECT COUNT(*) FROM users"
        count_params = []
        if where_clauses:
            count_query += " WHERE " + " AND ".join(where_clauses)
            count_params = params[:-2]  # Exclude limit and offset

        cur.execute(count_query, count_params)
        total_count = cur.fetchone()['count']

        # Get users
        cur.execute(query, params)
        users = cur.fetchall()

        return cors_response(200, {
            "users": users,
            "pagination": {
                "total": total_count,
                "offset": offset,
                "limit": limit,
                "hasMore": (offset + limit) < total_count
            }
        })

    except Exception as e:
        return cors_response(500, f"Error: {str(e)}")
    finally:
        if conn:
            conn.close()

def deleteUser(event, context):
    conn = None
    try:
        # Verify admin authorization
        auth_header = event.get('headers', {}).get('Authorization')
        token = auth_header.split(' ')[-1]
        token_payload = verify_token(token)

        user_id = event['pathParameters'].get('userId')
        if not user_id:
            return cors_response(400, "User ID is required")

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Verify requester is admin
        if not is_admin(token_payload, conn, cur):
            return cors_response(403, "Admin access required")

        # Get user email for Cognito deletion
        cur.execute("SELECT email FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()

        if not user:
            return cors_response(404, "User not found")

        # Delete from Cognito
        try:
            cognito_client = boto3.client('cognito-idp')
            cognito_client.admin_delete_user(
                UserPoolId=os.environ['COGNITO_USER_POOL_ID'],
                Username=user['email']
            )
        except Exception as e:
            return cors_response(500, f"Error deleting Cognito user: {str(e)}")

        # Delete from database (cascade will handle related records)
        cur.execute("DELETE FROM users WHERE id = %s RETURNING id", (user_id,))
        deleted = cur.fetchone()

        # Log deletion
        log_query = """
            INSERT INTO admin_logs (adminId, actionType, targetId, details)
            VALUES (%s, 'delete_user', %s, %s)
        """
        admin_id = token_payload.get('sub')
        cur.execute(log_query, (
            admin_id,
            user_id,
            f"Deleted user {user['email']}"
        ))

        conn.commit()

        return cors_response(200, {
            "message": "User deleted successfully",
            "userId": user_id
        })

    except Exception as e:
        if conn:
            conn.rollback()
        return cors_response(500, f"Error: {str(e)}")
    finally:
        if conn:
            conn.close()

def logAction(event, context):
    conn = None
    try:
        # Verify admin authorization
        auth_header = event.get('headers', {}).get('Authorization')
        token = auth_header.split(' ')[-1]
        token_payload = verify_token(token)

        # Parse request body
        try:
            body = json.loads(event.get('body', {}))
        except json.JSONDecodeError as e:
            return cors_response(400, f"Invalid JSON: {str(e)}")

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Verify requester is admin
        if not is_admin(token_payload, conn, cur):
            return cors_response(403, "Admin access required")

        # Extract log information
        action_type = body.get('actionType')
        target_id = body.get('targetId')
        details = body.get('details')

        if not action_type:
            return cors_response(400, "Action type is required")

        # Insert log entry
        log_query = """
            INSERT INTO admin_logs (adminId, actionType, targetId, details)
            VALUES (%s, %s, %s, %s)
            RETURNING id, adminId, actionType, targetId, details, timestamp
        """
        admin_id = token_payload.get('sub')
        cur.execute(log_query, (admin_id, action_type, target_id, details))
        new_log = cur.fetchone()
        
        conn.commit()

        return cors_response(201, {"log": new_log})

    except Exception as e:
        if conn:
            conn.rollback()
        return cors_response(500, f"Error: {str(e)}")
    finally:
        if conn:
            conn.close()

def getLogs(event, context):
    conn = None
    try:
        # Verify admin authorization
        auth_header = event.get('headers', {}).get('Authorization')
        token = auth_header.split(' ')[-1]
        token_payload = verify_token(token)

        # Get path and query parameters
        user_id = event['pathParameters'].get('userId')
        query_params = event.get('queryStringParameters', {}) or {}
        action_type = query_params.get('actionType')
        start_date = query_params.get('startDate')
        end_date = query_params.get('endDate')
        limit = int(query_params.get('limit', '50'))
        offset = int(query_params.get('offset', '0'))

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Verify requester is admin
        if not is_admin(token_payload, conn, cur):
            return cors_response(403, "Admin access required")

        # Build query
        query = """
            SELECT l.*, 
                   admin.email as admin_email,
                   target.email as target_email
            FROM admin_logs l
            JOIN users admin ON l.adminId = admin.id
            LEFT JOIN users target ON l.targetId = target.id
            WHERE 1=1
        """
        params = []

        if user_id:
            query += " AND l.adminId = %s"
            params.append(user_id)
        if action_type:
            query += " AND l.actionType = %s"
            params.append(action_type)
        if start_date:
            query += " AND l.timestamp >= %s"
            params.append(start_date)
        if end_date:
            query += " AND l.timestamp <= %s"
            params.append(end_date)

        # Add sorting and pagination
        query += " ORDER BY l.timestamp DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        # Get total count
        count_query = "SELECT COUNT(*) FROM admin_logs l WHERE 1=1"
        count_params = []
        if user_id:
            count_query += " AND l.adminId = %s"
            count_params.append(user_id)
        if action_type:
            count_query += " AND l.actionType = %s"
            count_params.append(action_type)
        if start_date:
            count_query += " AND l.timestamp >= %s"
            count_params.append(start_date)
        if end_date:
            count_query += " AND l.timestamp <= %s"
            count_params.append(end_date)

        cur.execute(count_query, count_params)
        total_count = cur.fetchone()['count']

        # Get logs
        cur.execute(query, params)
        logs = cur.fetchall()

        return cors_response(200, {
            "logs": logs,
            "pagination": {
                "total": total_count,
                "offset": offset,
                "limit": limit,
                "hasMore": (offset + limit) < total_count,
                "currentPage": offset // limit + 1,
                "totalPages": (total_count + limit - 1) // limit
            },
            "filters": {
                "userId": user_id,
                "actionType": action_type,
                "startDate": start_date,
                "endDate": end_date
            }
        })

    except ValueError as e:
        return cors_response(400, f"Invalid pagination parameters: {str(e)}")
    except Exception as e:
        return cors_response(500, f"Error retrieving logs: {str(e)}")
    finally:
        if conn:
            conn.close()