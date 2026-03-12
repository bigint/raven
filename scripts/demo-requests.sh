#!/bin/bash
# Demo script: sends requests through the Raven proxy to test features
# including cache hits, embeddings, and cheap models.
#
# Usage:
#   RAVEN_KEY=raven_... ./scripts/demo-requests.sh
#
# Prerequisites:
#   - API running at localhost:3001
#   - A virtual key created in the dashboard
#   - At least one OpenAI provider configured with a valid API key

set -euo pipefail

API_URL="${RAVEN_API_URL:-http://localhost:3001}"
KEY="${RAVEN_KEY:?Set RAVEN_KEY to your virtual key}"
AUTH="Authorization: Bearer $KEY"
CT="Content-Type: application/json"

green() { printf "\033[32m%s\033[0m\n" "$1"; }
cyan()  { printf "\033[36m%s\033[0m\n" "$1"; }
dim()   { printf "\033[90m%s\033[0m\n" "$1"; }

# ------------------------------------------------------------------
cyan "=== 1. Chat Completion (gpt-4o-mini, non-streaming) ==="
dim "First request — should be a cache MISS"
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Say hello in one word"}],"temperature":0}' \
  | jq -r '.choices[0].message.content // .error'
green "Done."

echo ""
cyan "=== 2. Same request again — should be a cache HIT ==="
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Say hello in one word"}],"temperature":0}' \
  | jq -r '.choices[0].message.content // .error'
green "Done — check Analytics for cache_hit=true."

echo ""
cyan "=== 3. Same request one more time — cache HIT again ==="
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Say hello in one word"}],"temperature":0}' \
  | jq -r '.choices[0].message.content // .error'
green "Done — 3 requests total, 2 cache hits."

echo ""
cyan "=== 4. Chat Completion (gpt-4.1-nano — cheapest) ==="
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" \
  -d '{"model":"gpt-4.1-nano","messages":[{"role":"user","content":"What is 2+2?"}],"temperature":0}' \
  | jq -r '.choices[0].message.content // .error'
green "Done."

echo ""
cyan "=== 5. Chat Completion (gpt-3.5-turbo) ==="
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" \
  -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"Name 3 colors"}],"temperature":0}' \
  | jq -r '.choices[0].message.content // .error'
green "Done."

echo ""
cyan "=== 6. Text Embeddings (text-embedding-3-small) ==="
curl -s "$API_URL/v1/proxy/openai/embeddings" \
  -H "$AUTH" -H "$CT" \
  -d '{"model":"text-embedding-3-small","input":"Hello world"}' \
  | jq '{model: .model, dimensions: (.data[0].embedding | length), usage: .usage} // .error'
green "Done."

echo ""
cyan "=== 7. Text Embeddings (text-embedding-3-large) ==="
curl -s "$API_URL/v1/proxy/openai/embeddings" \
  -H "$AUTH" -H "$CT" \
  -d '{"model":"text-embedding-3-large","input":"The quick brown fox"}' \
  | jq '{model: .model, dimensions: (.data[0].embedding | length), usage: .usage} // .error'
green "Done."

echo ""
cyan "=== 8. Embeddings cache test — same request again ==="
curl -s "$API_URL/v1/proxy/openai/embeddings" \
  -H "$AUTH" -H "$CT" \
  -d '{"model":"text-embedding-3-small","input":"Hello world"}' \
  | jq '{model: .model, dimensions: (.data[0].embedding | length), usage: .usage} // .error'
green "Done — should be a cache hit."

echo ""
cyan "=== 9. Chat Completion (gpt-4.1-mini) ==="
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" \
  -d '{"model":"gpt-4.1-mini","messages":[{"role":"user","content":"What is the capital of France?"}],"temperature":0}' \
  | jq -r '.choices[0].message.content // .error'
green "Done."

echo ""
cyan "=== 10. Streaming request (no cache, just works) ==="
dim "Streaming response:"
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Count to 5"}],"stream":true}' \
  | grep -o '"content":"[^"]*"' | sed 's/"content":"//;s/"//' | tr -d '\n'
echo ""
green "Done — streaming requests skip cache by design."

echo ""
green "=== All done! ==="
echo "Check the dashboard:"
echo "  - Analytics: cache hit rate should show hits"
echo "  - Requests: you should see all models logged"
echo "  - Multiple providers and models in usage breakdown"
