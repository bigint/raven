#!/bin/sh
set -e

start_postgres() {
  if [ ! -f /var/lib/postgresql/data/PG_VERSION ]; then
    echo "Initializing PostgreSQL..."
    su postgres -c "initdb -D /var/lib/postgresql/data"
    su postgres -c "pg_ctl start -D /var/lib/postgresql/data -l /var/lib/postgresql/postgresql.log -w"
    su postgres -c "createuser -s raven"
    su postgres -c "psql -c \"ALTER USER raven WITH PASSWORD 'raven';\""
    su postgres -c "createdb -O raven raven"
  else
    su postgres -c "pg_ctl start -D /var/lib/postgresql/data -l /var/lib/postgresql/postgresql.log -w"
  fi
}

start_redis() {
  redis-server --daemonize yes
}

run_migrations() {
  echo "Running database migrations..."
  node migrate.mjs
}

echo "Starting Raven..."

start_postgres
start_redis

case "$1" in
  serve)
    run_migrations
    node api/index.js &
    node cron/index.js &
    node web/apps/web/server.js
    ;;
  api)
    run_migrations
    node api/index.js
    ;;
  web)
    node web/apps/web/server.js
    ;;
  cron)
    node cron/index.js
    ;;
  *)
    exec "$@"
    ;;
esac
