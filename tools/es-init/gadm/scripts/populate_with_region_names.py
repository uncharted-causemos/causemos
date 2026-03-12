import json
import os
import glob
import re
from elasticsearch import helpers
from common import get_es_client, logger, fix_name


def geometry_to_bbox(geometry):
    """Convert a GeoJSON geometry to an Elasticsearch envelope bounding box.

    Returns {"type": "envelope", "coordinates": [[minLon, maxLat], [maxLon, minLat]]}.
    """
    if geometry is None:
        return None

    def extract_coords(geom):
        """Recursively yield all [lon, lat] leaf coordinate pairs."""
        geo_type = geom.get("type", "")
        coords = geom.get("coordinates", [])
        if geo_type in ("Point",):
            yield coords
        elif geo_type in ("LineString", "MultiPoint"):
            for c in coords:
                yield c
        elif geo_type in ("Polygon", "MultiLineString"):
            for ring in coords:
                for c in ring:
                    yield c
        elif geo_type in ("MultiPolygon",):
            for polygon in coords:
                for ring in polygon:
                    for c in ring:
                        yield c
        elif geo_type == "GeometryCollection":
            for g in geom.get("geometries", []):
                yield from extract_coords(g)

    lons = []
    lats = []
    for lon, lat in extract_coords(geometry):
        lons.append(lon)
        lats.append(lat)

    if not lons:
        return None

    return {
        "type": "envelope",
        "coordinates": [
            [min(lons), max(lats)],
            [max(lons), min(lats)],
        ],
    }


def populate_es_with_gadm41():
    elastic = get_es_client()

    # Pattern for GADM 4.1 JSON files
    data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
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
        logger.info(f"Processing GADM file: {file}")
        try:
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
                            val = fix_name(properties[input_key])
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
                            new_row["bbox"] = geometry_to_bbox(geometry)

                        filtered_rows.append(new_row)

                if not filtered_rows:
                    logger.warning(f"No valid features found in {file}")
                    continue

                # make the bulk call, and get a response
                response = helpers.bulk(elastic, filtered_rows, index="gadm-name")
                logger.info(f"Successfully ingested {response[0]} documents from {file}")
        except Exception as e:
            logger.error(f"Error processing GADM file {file}: {e}")

if __name__ == "__main__":
    import sys
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
    from common import get_es_client, logger
    populate_es_with_gadm41()
