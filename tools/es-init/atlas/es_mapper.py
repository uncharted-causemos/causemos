import os
import sys
import logging
from elasticsearch import Elasticsearch
import json

FORMAT = "%(asctime)-25s %(levelname)-8s %(message)s"
logging.basicConfig(format=FORMAT)
logger = logging.getLogger("es_mapper")
logger.setLevel(20)


def scan_directory(directory):
    """
    Returns absolute path of json files
    """
    mapping_files = []
    for f in os.listdir(directory):
        if not f.endswith("json"):
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

    response = client.indices.create(
        index=index_name,
        body={"mappings": index_mappings, "settings": settings},
        ignore=400,
    )
    if "error" in response:
        status = response["status"]
        logger.info(f"\t{status}")
    else:
        logger.info(f"\t{response}")


if __name__ == "__main__":
    esURL = os.environ.get("ES")
    esUsername = os.environ.get("ES_USERNAME")
    esPassword = os.environ.get("ES_PASSWORD")

    mappings = [mapping.split("/")[-1] for mapping in scan_directory("./mappings")]

    if esURL == None:
        logger.error("ES URL not specified")
        exit(-1)

    client = None
    if esUsername == None or esPassword == None:
        client = Elasticsearch([esURL])
    else:
        client = Elasticsearch(
            [esURL], http_auth=(esUsername, esPassword), verify_certs=False
        )

    for mapping_file in mappings:
        index_name = mapping_file.split(".")[0]
        logger.info(f"Creating index {index_name}")

        with open("./mappings/" + mapping_file, "r") as F:
            content = F.read()
            content = json.loads(content)
            create_index(client, index_name, content)
