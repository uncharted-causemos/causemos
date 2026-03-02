import os
import sys
from elasticsearch import Elasticsearch
import logging

FORMAT = "%(asctime)-25s %(levelname)-8s %(message)s"
logging.basicConfig(format=FORMAT)
logger = logging.getLogger("es_mapper")
logger.setLevel(20)


ES = os.environ.get("ES", "http://localhost:9200")

if __name__ == "__main__":
    client = Elasticsearch([ES])

    # Clean out dynamic, user created indices
    indices = client.indices.get(index="*").keys()
    for index_name in indices:
        if index_name.startswith("project") or index_name == "gadm-name":
            logger.info(f"Deleting index {index_name}")
            client.indices.delete(index=index_name)
