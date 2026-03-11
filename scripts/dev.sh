#!/usr/bin/env bash
set -euo pipefail
# Start Raven development environment
echo "Starting Raven development environment..."
cd "$(dirname "$0")/.."

# Start gateway in background
(cd gateway && go run . serve --config ../raven.yaml) &
GATEWAY_PID=$!

# Start dashboard dev server
(cd dashboard && pnpm dev) &
DASHBOARD_PID=$!

# Cleanup on exit
trap "kill $GATEWAY_PID $DASHBOARD_PID 2>/dev/null" EXIT
echo "Gateway: http://localhost:8080"
echo "Dashboard: http://localhost:5173"
wait
