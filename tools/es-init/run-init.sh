#!/bin/bash
set -e

# Configuration (can be overridden by environment variables)
export ES_URL=${ES_URL:-"http://elasticsearch:9200"}
export ES_USER=${ES_USER:-""}
export ES_PWD=${ES_PWD:-""}
export MINIO_ENDPOINT=${MINIO_ENDPOINT:-"http://minio:9000"}
export MINIO_ACCESS=${MINIO_ACCESS:-"admin"}
export MINIO_SECRET=${MINIO_SECRET:-"admin123"}
export MINIO_BUCKET=${MINIO_BUCKET:-"indicators"}

echo "Waiting for Elasticsearch at $ES_URL..."
until curl -s "$ES_URL" > /dev/null; do
  echo "Elasticsearch is unavailable - sleeping"
  sleep 5
done
echo "Elasticsearch is up!"

# Skip if data-datacube index already has documents (idempotency guard)
echo "Checking initialization state..."
COUNT_RESPONSE=$(curl -s "$ES_URL/data-datacube/_count")
COUNT=$(echo "$COUNT_RESPONSE" | grep -o '"count":[0-9]*' | grep -o '[0-9]*' || echo 0)
if [ "$COUNT" -gt "0" ]; then
  echo "Already initialized ($COUNT documents found in data-datacube). Skipping."
  exit 0
fi
echo "No existing data found, proceeding with initialization..."

# Set PYTHONPATH to include /app for easy imports
export PYTHONPATH=$PYTHONPATH:/app

# 1. Clean indices
echo "Step 1: Cleaning indices..."
python3 atlas/clean_indices.py

# 2. Create indices and mappings
echo "Step 2: Creating indices and mappings..."
python3 atlas/es_mapper.py

# 3. Ingest GADM data
echo "Step 3: Ingesting GADM data..."
python3 gadm/ingest_gadm41_data.py

# 4. Ingest datacube data
echo "Step 4: Ingesting datacube data..."
python3 -m datacube.scripts.populate_with_data

# 5. Generate vector tiles
echo "Step 5: Generating vector tiles..."
/app/vector-tiles/generate_tiles.sh

echo "Initialization complete!"
