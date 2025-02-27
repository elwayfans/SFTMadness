import os
import psycopg2

def get_db_connection():
    return psycopg2.connect(
        dbname=os.environ['DB_NAME'],
        host=os.environ['DB_HOST'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        port=os.environ['DB_PORT'],

        connect_timeout=5)

def cleanup_handler(event, context):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT cleanup_expired_tokens()")
                conn.commit()
                
                # Get count of remaining tokens for logging
                cur.execute("SELECT COUNT(*) FROM invalidated_tokens")
                remaining_count = cur.fetchone()[0]
                
                print(f"Cleanup completed successfully. {remaining_count} tokens remaining.")
                
        return {
            'statusCode': 200,
            'body': 'Cleanup successful'
        }
    except Exception as e:
        print(f"Error during cleanup: {str(e)}")
        return {
            'statusCode': 500,
            'body': f'Cleanup failed: {str(e)}'
        }