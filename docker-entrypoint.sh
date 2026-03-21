#!/bin/sh
set -e

echo "Running database migrations..."
npx drizzle-kit migrate

echo "Starting Raven..."
if [ "$1" = "serve" ]; then
  node api/index.js &
  node web/server.js
elif [ "$1" = "cron" ]; then
  node api/cron.js
else
  exec "$@"
fi
