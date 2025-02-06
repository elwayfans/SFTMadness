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
        if resource_path == '/analytics' and http_method == 'POST':
            return logMetric(event, context)
        elif resource_path == '/analytics/{metricId}' and http_method == 'GET':
            return getAnalytics(event, context)
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
#analytics functions

def logMetric(event, context):
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
        user_id = token_payload.get('sub')

        # Extract metric information
        metric_name = body.get('metricName')
        metric_value = body.get('metricValue')

        # Validate required fields
        if not metric_name or metric_value is None:
            return cors_response(400, "Missing required fields: metricName and metricValue are required")

        # Validate metric value is numeric
        try:
            metric_value = float(metric_value)
        except ValueError:
            return cors_response(400, "metricValue must be numeric")

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Insert metric
        insert_query = """
            INSERT INTO analytics (userId, metricName, metricValue)
            VALUES (%s, %s, %s)
            RETURNING id, userId, metricName, metricValue, timestamp
        """
        cur.execute(insert_query, (user_id, metric_name, metric_value))
        new_metric = cur.fetchone()
        
        conn.commit()
        
        return cors_response(201, {
            "message": "Metric logged successfully",
            "metric": new_metric
        })

    except Exception as e:
        if conn:
            conn.rollback()
        return cors_response(500, f"Error logging metric: {str(e)}")
    finally:
        if conn:
            conn.close()

def getAnalytics(event, context):
    conn = None
    try:
        # Get metric ID from path parameters
        metric_id = event['pathParameters'].get('metricId')
        
        # Get query parameters
        query_params = event.get('queryStringParameters', {}) or {}
        metric_name = query_params.get('metricName')
        start_date = query_params.get('startDate')
        end_date = query_params.get('endDate')
        aggregation = query_params.get('aggregation', 'none')  # none, sum, avg, min, max
        group_by = query_params.get('groupBy', 'none')  # none, day, week, month

        # Get user ID from token
        auth_header = event.get('headers', {}).get('Authorization')
        token = auth_header.split(' ')[-1]
        token_payload = verify_token(token)
        user_id = token_payload.get('sub')

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # If specific metric ID is requested
        if metric_id:
            cur.execute(
                "SELECT * FROM analytics WHERE id = %s AND userId = %s",
                (metric_id, user_id)
            )
            metric = cur.fetchone()
            
            if not metric:
                return cors_response(404, "Metric not found or unauthorized access")
                
            return cors_response(200, {"metric": metric})

        # Build query based on aggregation and grouping
        select_clause = "userId, metricName"
        if aggregation == 'none':
            select_clause += ", metricValue, timestamp"
        else:
            if aggregation == 'sum':
                select_clause += ", SUM(metricValue) as value"
            elif aggregation == 'avg':
                select_clause += ", AVG(metricValue) as value"
            elif aggregation == 'min':
                select_clause += ", MIN(metricValue) as value"
            elif aggregation == 'max':
                select_clause += ", MAX(metricValue) as value"
            else:
                return cors_response(400, "Invalid aggregation type")

        # Add time grouping if requested
        if group_by != 'none':
            if group_by == 'day':
                select_clause += ", DATE(timestamp) as period"
            elif group_by == 'week':
                select_clause += ", DATE_TRUNC('week', timestamp) as period"
            elif group_by == 'month':
                select_clause += ", DATE_TRUNC('month', timestamp) as period"
            else:
                return cors_response(400, "Invalid grouping type")

        # Build the query
        query = f"SELECT {select_clause} FROM analytics WHERE userId = %s"
        params = [user_id]

        if metric_name:
            query += " AND metricName = %s"
            params.append(metric_name)
        if start_date:
            query += " AND timestamp >= %s"
            params.append(start_date)
        if end_date:
            query += " AND timestamp <= %s"
            params.append(end_date)

        # Add grouping
        if group_by != 'none':
            query += " GROUP BY userId, metricName, period ORDER BY period"
        elif aggregation != 'none':
            query += " GROUP BY userId, metricName"
        else:
            query += " ORDER BY timestamp DESC"

        # Execute query
        cur.execute(query, params)
        analytics = cur.fetchall()

        # Calculate summary statistics
        summary = None
        if metric_name and analytics:
            cur.execute("""
                SELECT 
                    COUNT(*) as count,
                    AVG(metricValue) as average,
                    MIN(metricValue) as minimum,
                    MAX(metricValue) as maximum,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY metricValue) as median
                FROM analytics 
                WHERE userId = %s AND metricName = %s
            """, [user_id, metric_name])
            summary = cur.fetchone()

        return cors_response(200, {
            "analytics": analytics,
            "summary": summary,
            "filters": {
                "metricName": metric_name,
                "startDate": start_date,
                "endDate": end_date,
                "aggregation": aggregation,
                "groupBy": group_by
            }
        })

    except Exception as e:
        return cors_response(500, f"Error retrieving analytics: {str(e)}")
    finally:
        if conn:
            conn.close()