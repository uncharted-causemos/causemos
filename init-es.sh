#!/bin/bash
set -e

DOCKER_REGISTRY=${DOCKER_REGISTRY:-"docker.uncharted.software"}
DOCKER_ORG=${DOCKER_ORG:-"worldmodeler"}
ES_URL=${ES_URL:-"http://localhost:9200"}
MINIO_ENDPOINT=${MINIO_ENDPOINT:-"http://localhost:9000"}
MINIO_ACCESS=${MINIO_ACCESS:-"admin"}
MINIO_SECRET=${MINIO_SECRET:-"admin123"}
MINIO_BUCKET=${MINIO_BUCKET:-"indicators"}

docker run --rm \
  --network host \
  -e ES_URL="$ES_URL" \
  -e MINIO_ENDPOINT="$MINIO_ENDPOINT" \
  -e MINIO_ACCESS="$MINIO_ACCESS" \
  -e MINIO_SECRET="$MINIO_SECRET" \
  -e MINIO_BUCKET="$MINIO_BUCKET" \
  "${DOCKER_REGISTRY}/${DOCKER_ORG}/es-init:local"
