#!/bin/bash
# Demo: embedding requests with cache hit testing.
#
# Usage:
#   RAVEN_KEY=rk_... ./scripts/demo-embedding.sh

set -euo pipefail

API_URL="${RAVEN_API_URL:-http://localhost:3001}"
KEY="${RAVEN_KEY:?Set RAVEN_KEY to your virtual key}"
AUTH="Authorization: Bearer $KEY"
CT="Content-Type: application/json"

green() { printf "\033[32m%s\033[0m\n" "$1"; }
cyan()  { printf "\033[36m%s\033[0m\n" "$1"; }

cyan "=== 1. text-embedding-3-small ==="
curl -s "$API_URL/v1/proxy/openai/embeddings" \
  -H "$AUTH" -H "$CT" \
  -d '{"model":"text-embedding-3-small","input":"Hello world"}' \
  | jq '{model: .model, dimensions: (.data[0].embedding | length), usage: .usage} // .error'
green "Done."

echo ""
cyan "=== 2. text-embedding-3-small (cache hit) ==="
curl -s "$API_URL/v1/proxy/openai/embeddings" \
  -H "$AUTH" -H "$CT" \
  -d '{"model":"text-embedding-3-small","input":"Hello world"}' \
  | jq '{model: .model, dimensions: (.data[0].embedding | length), usage: .usage} // .error'
green "Done — should be a cache hit."

echo ""
cyan "=== 3. text-embedding-3-large ==="
curl -s "$API_URL/v1/proxy/openai/embeddings" \
  -H "$AUTH" -H "$CT" \
  -d '{"model":"text-embedding-3-large","input":"The quick brown fox jumps over the lazy dog"}' \
  | jq '{model: .model, dimensions: (.data[0].embedding | length), usage: .usage} // .error'
green "Done."

echo ""
cyan "=== 4. text-embedding-3-small — different input ==="
curl -s "$API_URL/v1/proxy/openai/embeddings" \
  -H "$AUTH" -H "$CT" \
  -d '{"model":"text-embedding-3-small","input":"Machine learning and artificial intelligence"}' \
  | jq '{model: .model, dimensions: (.data[0].embedding | length), usage: .usage} // .error'
green "Done."

echo ""
cyan "=== 5. text-embedding-3-large (cache hit) ==="
curl -s "$API_URL/v1/proxy/openai/embeddings" \
  -H "$AUTH" -H "$CT" \
  -d '{"model":"text-embedding-3-large","input":"The quick brown fox jumps over the lazy dog"}' \
  | jq '{model: .model, dimensions: (.data[0].embedding | length), usage: .usage} // .error'
green "Done — should be a cache hit."

echo ""
green "=== Embedding demo complete (5 requests, 2 cache hits) ==="
