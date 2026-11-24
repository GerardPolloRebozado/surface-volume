#!/bin/sh
set -e

echo "=== Running database migrations ==="
pnpm prisma migrate deploy

echo "=== Starting NestJS application ==="
exec node dist/main
