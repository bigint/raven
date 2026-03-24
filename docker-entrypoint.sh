#!/bin/sh
set -e

PG_DATA=/var/lib/postgresql/data
PG_LOG=/var/lib/postgresql/postgresql.log

start_postgres() {
  if [ ! -f "$PG_DATA/PG_VERSION" ]; then
    echo "Initializing PostgreSQL..."
    su postgres -c "initdb -D $PG_DATA"
    su postgres -c "pg_ctl start -D $PG_DATA -l $PG_LOG -w"
    su postgres -c "createuser -s raven"
    su postgres -c "psql -c \"ALTER USER raven WITH PASSWORD 'raven';\""
    su postgres -c "createdb -O raven raven"
  else
    su postgres -c "pg_ctl start -D $PG_DATA -l $PG_LOG -w"
  fi
}

start_redis() {
  redis-server --daemonize yes
}

export BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-$(head -c 32 /dev/urandom | base64)}"
export ENCRYPTION_SECRET="${ENCRYPTION_SECRET:-$(head -c 32 /dev/urandom | base64)}"

case "$DATABASE_URL" in *localhost*|*127.0.0.1*) start_postgres ;; esac
case "$REDIS_URL" in *localhost*|*127.0.0.1*) start_redis ;; esac

echo "Starting Raven..."

case "$1" in
  serve)
    node migrate.mjs
    node api/index.js &
    node cron/index.js &
    node web/apps/web/server.js
    ;;
  api)
    node migrate.mjs
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
