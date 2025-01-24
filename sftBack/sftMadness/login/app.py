import json

def lambda_handler(event, context):
    http_method = event.get("httpMethod")
    path = event.get("path")
    path_parameters = event.get("pathParameters") or {}
    query_parameters = event.get("queryStringParameters") or {}

    def response(status_code, message):
        return {
            "statusCode": status_code,
            "body": json.dumps({"message": message}),
        }

    try:
        return response(200, "this is a login")

    except Exception as e:
        return response(500, f"Internal server error: {str(e)}")