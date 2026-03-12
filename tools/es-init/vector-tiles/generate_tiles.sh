#!/bin/bash
set -e

# Base directory for GADM 4.1 files
DATA_DIR="/app/gadm/data"
# Base directory for the vector tiles script
VECTORTILES_DIR="/app/vector-tiles"
# Output directory for generated tiles
DIST_DIR="$VECTORTILES_DIR/dist"

# Cleanup any previous runs
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Step 1: Update GeoJSON properties to include unique ID for each feature
# Using the python script to correctly build IDs matching Causemos logic
echo "Step 1/3: Updating GeoJSON properties with unique IDs..."
python3 "$VECTORTILES_DIR/update_geojson_properties.py" "$DATA_DIR"/gadm41_*.json

# Step 2: Generate Vector Tiles for each admin level (0-3)
echo "Step 2/3: Generating vector tiles with tippecanoe..."
LEVELS=(0 1 2 3)
for l in "${LEVELS[@]}"; do
    outputName="cm-boundaries-adm${l}"
    mbtilesFile="$outputName.mbtiles"
    layerName="boundaries-adm${l}"

    # Identify files for this specific admin level
    # e.g., gadm41_USA_0.json, gadm41_COLORADO_1.json, etc.
    files=$(ls "$DATA_DIR"/gadm41_*_"${l}".json 2>/dev/null || true)

    if [ -z "$files" ]; then
        echo "No GeoJSON files found for admin level $l. Skipping."
        continue
    fi

    echo "Creating admin level $l vector tile set from: $(echo $files | tr '\n' ' ')"

    # Generate .mbtiles file using tippecanoe
    # -zg: automatic zoom guessing
    # -o: output file
    # -l: layer name within the vector tile
    # --coalesce-densest-as-needed: simplify data when it's too dense for a tile
    # --extend-zooms-if-still-dropping: keep increasing zoom if detail is still being dropped
    tippecanoe -zg -o "$mbtilesFile" -l "$layerName" \
        --coalesce-densest-as-needed \
        --extend-zooms-if-still-dropping \
        --force \
        $files

    echo "Extracting $mbtilesFile to $DIST_DIR/$outputName..."
    # Extract tiles into standard Z/X/Y.pbf directory structure
    python3 "$VECTORTILES_DIR/extract_mbtiles.py" "$mbtilesFile" "$DIST_DIR/$outputName"

    # Remove the intermediate MBTiles database
    rm "$mbtilesFile"
done

# Step 3: Upload all generated tiles to the 'vector-tiles' Minio bucket
echo "Step 3/3: Uploading generated tiles to Minio..."
python3 "$VECTORTILES_DIR/upload_tiles.py" "$DIST_DIR"

echo "Vector tile generation and upload complete!"
