#!/bin/sh
set -e

run_migrations() {
  echo "Running database migrations..."
  node migrate.mjs
}

echo "Starting Raven..."
case "$1" in
  serve)
    run_migrations
    node api/index.js &
    node web/server.js
    ;;
  api)
    run_migrations
    node api/index.js
    ;;
  web)
    node web/server.js
    ;;
  cron)
    node cron/index.js
    ;;
  *)
    exec "$@"
    ;;
esac
