#!/usr/bin/env bash
set -euo pipefail

# Generate Kotlin and TypeScript API clients from OpenAPI spec
# Run this after backend NestJS changes that affect the OpenAPI spec

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

OPENAPI_JSON="$REPO_ROOT/packages/backend-nestjs/openapi.json"
OUTPUT_DIR_KT="$REPO_ROOT/packages/api-client-kt"
OUTPUT_DIR_TS="$REPO_ROOT/packages/api-client-ts"
GENERATOR_VERSION="latest"
DOCKER_USER="1000:1000"

echo "=== Surface Volume API Client Generator ==="
echo "OpenAPI spec: $OPENAPI_JSON"
echo "Kotlin output: $OUTPUT_DIR_KT"
echo "TypeScript output: $OUTPUT_DIR_TS"

if [ ! -f "$OPENAPI_JSON" ]; then
  echo "ERROR: OpenAPI JSON not found at $OPENAPI_JSON"
  echo "Run the NestJS backend first to generate the spec, or run 'pnpm run build' in packages/backend-nestjs"
  exit 1
fi

# Clean output directories so we always regenerate from scratch
rm -rf "$OUTPUT_DIR_KT" "$OUTPUT_DIR_TS"
mkdir -p "$OUTPUT_DIR_KT" "$OUTPUT_DIR_TS"

# Generate Kotlin Multiplatform API client via Docker
echo ""
echo "=== Generating Kotlin client ==="
docker run --rm \
  -u "$DOCKER_USER" \
  -v "$REPO_ROOT:$REPO_ROOT" \
  -w "$REPO_ROOT" \
  "openapitools/openapi-generator-cli:$GENERATOR_VERSION" \
  generate \
  -i "$OPENAPI_JSON" \
  -g kotlin \
  -p kotlinPackage=surfacevolume.api \
  -p apiPackage=surfacevolume.api.client \
  -p modelPackage=surfacevolume.api.models \
  -p dateTimeType=java.time.LocalDateTime \
  -o "$OUTPUT_DIR_KT"

# Generate TypeScript (axios) API client via Docker
echo ""
echo "=== Generating TypeScript client ==="
docker run --rm \
  -u "$DOCKER_USER" \
  -v "$REPO_ROOT:$REPO_ROOT" \
  -w "$REPO_ROOT" \
  "openapitools/openapi-generator-cli:$GENERATOR_VERSION" \
  generate \
  -i "$OPENAPI_JSON" \
  -g typescript-axios \
  -p withSeparateModelsAndApi=true \
  -p apiPackage=surfacevolume.api.client \
  -p modelPackage=surfacevolume.api.models \
  -p basePath=http://localhost:8080 \
  -o "$OUTPUT_DIR_TS"

echo ""
echo "=== API client generation complete ==="
echo "Kotlin client: $OUTPUT_DIR_KT"
echo "TypeScript client: $OUTPUT_DIR_TS"
