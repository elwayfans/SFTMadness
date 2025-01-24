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
    
def verify_token(token):
    #verify token
    pass

####################
#sftEvents functions

def scheduleEvent(event, context):
    #schedule event
    pass

def getEventById(event, context):
    #get event by id
    pass

def getEvents(event, context):
    return cors_response(200, "got events")

def updateEvent(event, context):
    #update event
    pass

def deleteEvent(event, context):
    #delete event
    pass