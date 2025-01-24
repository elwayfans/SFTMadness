import json
from datetime import datetime, date

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
        if resource_path == '/customs/{userId}' and http_method == 'POST':
            return setCustoms(event, context)
        elif resource_path == '/customs/{userId}' and http_method == 'GET':
            return getCustoms(event, context)
        elif resource_path == '/customs/{userId}' and http_method == 'PUT':
            return updateCustoms(event, context)
        elif resource_path == '/customs/{userId}' and http_method == 'DELETE':
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
    
def verify_token(token):
    #verify token
    pass

####################
#customs functions

def setCustoms(event, context):
    #set customs
    return cors_response(200, "Customs set")

def getCustoms(event, context):
    #get customs
    return cors_response(200, "Customs get")

def updateCustoms(event, context):
    #update customs
    return cors_response(200, "Customs updated")

def deleteCustoms(event, context):
    #delete customs
    return cors_response(200, "Customs deleted")