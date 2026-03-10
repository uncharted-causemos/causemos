#!/bin/bash
set -e

DOCKER_REGISTRY=${DOCKER_REGISTRY:-"docker.uncharted.software"}
DOCKER_ORG=${DOCKER_ORG:-"worldmodeler"}
ES_URL=${ES_URL:-"http://localhost:9200"}

docker run --rm \
  --network host \
  -e ES_URL="$ES_URL" \
  "${DOCKER_REGISTRY}/${DOCKER_ORG}/es-init:latest"
