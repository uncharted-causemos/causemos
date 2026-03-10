#!/bin/bash
set -e

# Configuration (can be overridden by environment variables)
ES_URL=${ES_URL:-"http://elasticsearch:9200"}
ES_USER=${ES_USER:-""}
ES_PWD=${ES_PWD:-""}

echo "Waiting for Elasticsearch at $ES_URL..."
until curl -s "$ES_URL" > /dev/null; do
  echo "Elasticsearch is unavailable - sleeping"
  sleep 5
done

echo "Elasticsearch is up!"

# Export variables for the python scripts
export ES="$ES_URL"
export ES_USERNAME="$ES_USER"
export ES_PASSWORD="$ES_PWD"

# 1. Clean indices
echo "Step 1: Cleaning indices..."
cd /app/atlas
python3 clean_indices.py

# 2. Create indices and mappings
echo "Step 2: Creating indices and mappings..."
python3 es_mapper.py

# 3. Ingest GADM data
echo "Step 3: Ingesting GADM data..."
cd /app
export PYTHONPATH=$PYTHONPATH:/app
python3 gadm/ingest_gadm41_data.py

echo "Initialization complete!"
