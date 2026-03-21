#!/bin/sh
set -e

echo "Running database migrations..."
node migrate.mjs

echo "Starting Raven..."
if [ "$1" = "serve" ]; then
  node api/index.js &
  node web/server.js
elif [ "$1" = "cron" ]; then
  node cron/index.js
else
  exec "$@"
fi
