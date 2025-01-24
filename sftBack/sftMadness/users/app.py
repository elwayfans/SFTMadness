import json
import os
import psycopg2
from datetime import datetime, date
# import boto3
# import base64
# import jwt
# from botocore.exceptions import ClientError
from psycopg2.extras import RealDictCursor
# import requests
# from jwt.algorithms import RSAAlgorithm

def cors_response(status_code, body, content_type="application/json"):
    headers = {
        'Content-Type': content_type,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE',
    }

    if content_type == "application/json":
        body = json.dumps(body, default=str)
        # is_base64_encoded = False
    # else:
        # is_base64_encoded = True

    return {
        'statusCode': status_code,
        'body': body,
        'headers': headers,
        # 'isBase64Encoded': is_base64_encoded, #base64 for images if used
    }

def lambda_handler(event, context):
    if event['httpMethod'] == 'OPTIONS':
        return cors_response(200, "ok")
    
    http_method = event['httpMethod']
    resource_path = event['resource']

    #for no authentication
    if resource_path == '/users' and http_method == 'POST':
        return registerUser(event, context)
    
    # try:
    #     #verify token
    #     auth_header = event.get('headers', {}).get('Authorization')
    #     if not auth_header:
    #         return cors_response(401, "Unauthorized")
        
    #     token = auth_header.split(' ')[-1]
    #     verify_token(token)

    # except Exception as e:
    #     return cors_response(401, "Authentication failed")
        
    #routes with authentication
    try:
        if resource_path == '/users/{userId}' and http_method == 'GET':
            return getUser(event, context)
        elif resource_path == '/users/{userId}' and http_method == 'PUT':
            return updateUser(event, context)
        elif resource_path == '/users/{userId}' and http_method == 'DELETE':
            return deleteUser(event, context)
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
    
def verify_token(token):
    #verify token
    pass

####################
#user functions

def registerUser(event, context):

    conn = None

    try:
        body = json.loads(event.get('body', {}))
    except json.JSONDecodeError:
        return cors_response(400, f"Invalid JSON: {str(e)}")
    
    email = body.get('email')
    password = body.get('password')
    role = body.get('role')
    companyName = body.get('companyName')
    phoneNumber = body.get('phoneNumber')

    if not email or not password or not role:
        return cors_response(400, "Missing required fields")
    
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        user_insert_query = """INSERT INTO users (email, password, role, companyName, phoneNumber, joinDate) 
                    VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP) 
                    RETURNING id, email, password, role, companyName, phoneNumber, joinDate"""
        cur.execute(user_insert_query, (email, password, role, companyName, phoneNumber))
        new_user = cur.fetchone()
        conn.commit()

        return cors_response(201, {
            "message": "User created",
            "user": new_user
            #cognito response
        })

    # except ClientError as e: --cognito client error response
    #     return cors_response(400, f"Error creating user: {str(e)}")
    except Exception as e:
        return cors_response(500, f"Error creating user: {str(e)}")
    finally:
        if conn:
            conn.close()
    

def getUser(event, context):
    #get user
    return cors_response(200, "User retrieved")

def updateUser(event, context):
    #update user
    return cors_response(200, "User updated")

def deleteUser(event, context):
    #delete user
    return cors_response(200, "User deleted")