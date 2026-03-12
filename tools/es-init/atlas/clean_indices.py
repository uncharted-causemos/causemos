import os
import sys

# Add parent directory to sys.path so we can import common
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from common import get_es_client, logger

def clean_indices():
    client = get_es_client()
    try:
        # Clean out dynamic, user created indices
        indices = client.indices.get(index="*").keys()
        for index_name in indices:
            if index_name.startswith("project") or index_name in ("gadm-name", "data-datacube"):
                logger.info(f"Deleting index {index_name}")
                client.indices.delete(index=index_name)
    except Exception as e:
        logger.error(f"Error cleaning indices: {e}")

if __name__ == "__main__":
    clean_indices()
