import json
import psycopg2
import boto3
from botocore.exceptions import NoCredentialsError, ClientError
from itemadapter import ItemAdapter

# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html


# useful for handling different item types with a single interface

class PostgreSQLPipeline:
    def __init__(self):
        self.secret_name = "school-db-credentials"  # Replace with your secret name
        self.region_name = "us-west-2"  # Replace with your AWS region

    def get_db_credentials(self):
        # Create a Secrets Manager client
        session = boto3.session.Session()
        client = session.client(
            service_name="secretsmanager",
            region_name=self.region_name
        )

        try:
            # Fetch the secret
            response = client.get_secret_value(SecretId=self.secret_name)
            secret = json.loads(response["SecretString"])
            return secret
        except (NoCredentialsError, ClientError) as e:
            raise Exception(f"Failed to fetch credentials from AWS Secrets Manager: {e}")

    def open_spider(self, spider):
        # Fetch database credentials from AWS Secrets Manager
        credentials = self.get_db_credentials()

        # Connect to PostgreSQL
        self.connection = psycopg2.connect(
            dbname=credentials["DB_NAME"],
            user=credentials["DB_USER"],
            password=credentials["DB_PASSWORD"],
            host=credentials["DB_HOST"],
            port=credentials["DB_PORT"]
        )
        self.cursor = self.connection.cursor()

        # Create a table if it doesn't exist
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS school_pages (
                id SERIAL PRIMARY KEY,
                url TEXT NOT NULL,
                domain TEXT NOT NULL,
                text TEXT NOT NULL
            )
        """)
        self.connection.commit()

    def close_spider(self, spider):
        # Close the database connection
        if hasattr(self, 'connection'):
            self.connection.close()

    def process_item(self, item, spider):
        # Insert the item into the database
        self.cursor.execute("""
            INSERT INTO school_pages (url, domain, text)
            VALUES (%s, %s, %s)
        """, (item["url"], item["domain"], item["text"]))
        self.connection.commit()
        return item