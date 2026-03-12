import os
import logging
import re
from elasticsearch import Elasticsearch
import boto3
from botocore.client import Config

# Standardize environment variable names
ES_URL = os.getenv("ES_URL", "http://localhost:9200")
ES_USER = os.getenv("ES_USER", "")
ES_PWD = os.getenv("ES_PWD", "")

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "http://localhost:9000")
MINIO_ACCESS = os.getenv("MINIO_ACCESS", "admin")
MINIO_SECRET = os.getenv("MINIO_SECRET", "admin123")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "indicators")

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("es-init")

def get_es_client():
    if ES_USER and ES_PWD:
        return Elasticsearch(ES_URL, http_auth=(ES_USER, ES_PWD), verify_certs=False)
    return Elasticsearch(ES_URL)

def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=MINIO_ENDPOINT,
        aws_access_key_id=MINIO_ACCESS,
        aws_secret_access_key=MINIO_SECRET,
        config=Config(signature_version="s3v4"),
        region_name="us-east-1",
    )

def ensure_bucket(s3_client, bucket_name=MINIO_BUCKET):
    try:
        s3_client.head_bucket(Bucket=bucket_name)
    except Exception:
        s3_client.create_bucket(Bucket=bucket_name)
        logger.info(f"Created Minio bucket: {bucket_name}")

def fix_name(name):
    """Insert spaces between camelCase words, e.g. UnitedStates -> United States."""
    if name is None:
        return name
    return re.sub(r'([a-z])([A-Z])', r'\1 \2', str(name))
