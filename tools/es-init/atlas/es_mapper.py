import os
import sys
import json
from common import get_es_client, logger

def scan_directory(directory):
    """
    Returns absolute path of json files
    """
    mapping_files = []
    for f in os.listdir(directory):
        if not f.endswith(".json"):
            continue
        mapping_files.append(os.path.join(directory, f))
    return mapping_files


def create_index(client, index_name, index_mappings):
    """
    Create index, returns status 400 if already exist
    """
    settings = {
        "index.number_of_shards": 1,
        "index.number_of_replicas": 0,
        "analysis": {
            "analyzer": {
                "concept-text": {
                    "type": "pattern",
                    "pattern": "[_/]",
                    "lowercase": True,
                }
            }
        },
    }

    try:
        response = client.indices.create(
            index=index_name,
            body={"mappings": index_mappings, "settings": settings},
            ignore=400,
        )
        if "error" in response:
            status = response["status"]
            if status == 400:
                logger.info(f"Index {index_name} already exists.")
            else:
                logger.error(f"Error creating index {index_name}: {response}")
        else:
            logger.info(f"Created index {index_name}: {response}")
    except Exception as e:
        logger.error(f"Failed to create index {index_name}: {e}")


def map_indices():
    client = get_es_client()
    mappings_dir = os.path.join(os.path.dirname(__file__), "mappings")
    mapping_files = scan_directory(mappings_dir)

    for mapping_file in mapping_files:
        index_name = os.path.basename(mapping_file).split(".")[0]
        logger.info(f"Processing mapping: {index_name}")

        try:
            with open(mapping_file, "r") as f:
                content = json.load(f)
                create_index(client, index_name, content)
        except Exception as e:
            logger.error(f"Error processing mapping file {mapping_file}: {e}")

if __name__ == "__main__":
    # Add parent directory to sys.path so we can import common
    sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
    from common import get_es_client, logger
    map_indices()
