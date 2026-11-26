#!/bin/sh
set -e

echo "=== Waiting for database and running migrations ==="
attempt=0
until pnpm prisma migrate deploy; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "Database was not reachable after 30 attempts" >&2
    exit 1
  fi
  echo "Database not ready, retrying in 3s ($attempt/30)"
  sleep 3
done

echo "=== Starting NestJS application ==="
# The OTel SDK must be initialised before Nest imports Express / the pg driver.
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--require ./dist/telemetry/instrumentation.js"
exec node dist/main
