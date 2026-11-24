#!/usr/bin/env bash
set -euo pipefail

# Generate Kotlin and TypeScript API clients from OpenAPI spec
# Run this after backend NestJS changes that affect the OpenAPI spec

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

OPENAPI_JSON="$REPO_ROOT/packages/backend-nestjs/openapi.json"
OUTPUT_DIR_KT="$REPO_ROOT/packages/api-client-kt"
OUTPUT_DIR_TS="$REPO_ROOT/packages/api-client-ts"
GENERATOR_VERSION="${GENERATOR_VERSION:-latest}"
DOCKER_USER="${DOCKER_USER:-$(id -u):$(id -g)}"

echo "=== Surface Volume API Client Generator ==="
echo "OpenAPI spec: $OPENAPI_JSON"
echo "Kotlin output: $OUTPUT_DIR_KT"
echo "TypeScript output: $OUTPUT_DIR_TS"

# Step 1: Ensure OpenAPI JSON exists by building/starting the NestJS backend
if [ ! -f "$OPENAPI_JSON" ]; then
  echo "=== OpenAPI JSON not found, building NestJS backend ==="
  cd "$REPO_ROOT/packages/backend-nestjs"
  pnpm run build 2>&1 | tail -5
fi

if [ ! -f "$OPENAPI_JSON" ]; then
  # Try to start the backend server in background to generate the spec
  echo "=== Starting NestJS backend to generate OpenAPI spec ==="
  cd "$REPO_ROOT/packages/backend-nestjs"
  pnpm run start:dev &
  BACKEND_PID=$!
  sleep 20

  # Fetch OpenAPI JSON from running server
  curl -s http://localhost:8080/api-json > "$OPENAPI_JSON" 2>/dev/null || {
    echo "ERROR: Could not fetch OpenAPI spec from localhost:8080"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
  }

  # Stop backend
  kill $BACKEND_PID 2>/dev/null || true
fi

if [ ! -f "$OPENAPI_JSON" ]; then
  echo "ERROR: OpenAPI JSON not found at $OPENAPI_JSON"
  echo "Run the NestJS backend first to generate the spec, or run 'pnpm run build' in packages/backend-nestjs"
  exit 1
fi

# Clean output directories so we always regenerate from scratch
rm -rf "$OUTPUT_DIR_KT" "$OUTPUT_DIR_TS"
mkdir -p "$OUTPUT_DIR_KT" "$OUTPUT_DIR_TS"

# Create package.json for the TypeScript client so pnpm can resolve its axios dependency
cat > "$OUTPUT_DIR_TS/package.json" << 'PACKAGE_EOF'
{
  "name": "api-client-ts",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "index.ts",
  "dependencies": {
    "axios": "1.9.0"
  }
}
PACKAGE_EOF

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
  -p library=multiplatform \
  -p dateLibrary=kotlinx-datetime \
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
