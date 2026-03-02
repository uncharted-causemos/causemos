from elasticsearch import Elasticsearch, helpers
import json
import os
import glob
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

ES_URL = os.getenv("ES_URL", "http://localhost:9200")
ES_USER = os.getenv("ES_USER", "")
ES_PWD = os.getenv("ES_PWD", "")

def populate_es_with_gadm41():
    elastic = Elasticsearch(ES_URL, http_auth=(ES_USER, ES_PWD))

    # Pattern for GADM 4.1 JSON files
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    files = glob.glob(os.path.join(data_dir, "gadm41_*.json"))
    logger.info(f"Found {len(files)} GADM 4.1 files in {data_dir}")

    # Mapping GADM 4.1 property names to expected output format
    column_mapping = [
        {"input": "COUNTRY", "output": "country", "code": "GID_0"},
        {"input": "NAME_1", "output": "admin1", "code": "GID_1"},
        {"input": "NAME_2", "output": "admin2", "code": "GID_2"},
        {"input": "NAME_3", "output": "admin3", "code": "GID_3"},
    ]

    for file in files:
        logger.info(f"Processing file: {file}")
        with open(file, "r") as f:
            data = json.load(f)
            features = data.get("features", [])
            logger.info(f"Found {len(features)} features in {file}")
            filtered_rows = []
            for feature in features:
                properties = feature.get("properties", {})
                new_row = {}
                full_path = ""
                last_output = ""
                last_code = ""

                for mapping in column_mapping:
                    input_key = mapping["input"]
                    output_key = mapping["output"]
                    code_key = mapping["code"]

                    if input_key in properties:
                        val = properties[input_key]
                        full_path += val + "__"
                        new_row[output_key] = val
                        last_output = output_key
                        last_code = properties.get(code_key, "")

                if last_output:
                    new_row["level"] = last_output
                    new_row["code"] = last_code
                    new_row["_id"] = last_code
                    new_row["full_path"] = full_path[:-2]  # cut off the last __

                    geometry = feature.get("geometry")
                    if geometry:
                        new_row["bbox"] = geometry

                    filtered_rows.append(new_row)

            if not filtered_rows:
                logger.warning(f"No valid features found in {file}")
                continue

            try:
                # make the bulk call, and get a response
                response = helpers.bulk(elastic, filtered_rows, index="gadm-name")
                logger.info(f"Successfully ingested {response[0]} documents from {file}")
            except Exception as e:
                logger.error(f"Error ingesting file {file}: {e}")
