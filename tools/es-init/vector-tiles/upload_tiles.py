import os
import sys
from common import get_s3_client, ensure_bucket, logger

def upload_tiles(dist_dir):
    logger.info(f"Uploading tiles from {dist_dir}")
    bucket_name = "vector-tiles"

    # Connect to Minio
    s3 = get_s3_client()

    # Ensure bucket exists
    ensure_bucket(s3, bucket_name)

    # Walk through the dist directory and upload files
    count = 0
    for root, dirs, files in os.walk(dist_dir):
        for file in files:
            file_path = os.path.join(root, file)
            # S3 key should maintain the directory structure relative to dist_dir
            # e.g., cm-boundaries-adm0/0/0/0.pbf
            s_key = os.path.relpath(file_path, dist_dir)

            # Use appropriate Content-Type for vector tiles
            content_type = "application/vnd.mapbox-vector-tile"

            try:
                with open(file_path, 'rb') as data:
                    s3.put_object(Bucket=bucket_name,
                                  Key=s_key,
                                  Body=data,
                                  ContentType=content_type)
            except Exception as e:
                logger.error(f"Error uploading {file_path}: {e}")

            count += 1
            if count % 100 == 0:
                logger.info(f"Uploaded {count} tiles...")

    logger.info(f"Finished uploading {count} tiles to {bucket_name}.")

if __name__ == "__main__":
    sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
    from common import get_s3_client, ensure_bucket, logger
    if len(sys.argv) < 2:
        logger.error("Usage: python upload_tiles.py <dist_dir>")
        sys.exit(1)
    upload_tiles(sys.argv[1])
