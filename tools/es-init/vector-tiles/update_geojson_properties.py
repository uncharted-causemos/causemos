import json
import sys
import os
from common import fix_name, logger

def update_properties(file_path):
    logger.info(f"Updating properties for {file_path}")
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)

        for feature in data['features']:
            props = feature['properties']

            # Build ID: COUNTRY__NAME_1__NAME_2__NAME_3
            parts = []
            # GADM 4.1 uses COUNTRY and NAME_1, NAME_2, NAME_3
            if 'COUNTRY' in props:
                parts.append(fix_name(props['COUNTRY']))
            elif 'NAME_0' in props:
                parts.append(fix_name(props['NAME_0']))

            for i in range(1, 4):
                key = f'NAME_{i}'
                if key in props and props[key]:
                    parts.append(fix_name(props[key]))

            props['id'] = '__'.join(parts)

        with open(file_path, 'w') as f:
            json.dump(data, f)
    except Exception as e:
        logger.error(f"Error updating properties for {file_path}: {e}")

if __name__ == "__main__":
    sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
    from common import fix_name, logger
    if len(sys.argv) < 2:
        logger.error("Usage: python update_geojson_properties.py <file1> <file2> ...")
        sys.exit(1)
    for arg in sys.argv[1:]:
        update_properties(arg)
