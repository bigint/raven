#!/bin/bash
# Demo: text chat completions across multiple models and sessions.
#
# Usage:
#   RAVEN_KEY=rk_... ./scripts/demo-text.sh

set -euo pipefail

API_URL="${RAVEN_API_URL:-http://localhost:3001}"
KEY="${RAVEN_KEY:?Set RAVEN_KEY to your virtual key}"
AUTH="Authorization: Bearer $KEY"
CT="Content-Type: application/json"
SESSION="x-session-id: text-demo-$(date +%s)"

green() { printf "\033[32m%s\033[0m\n" "$1"; }
cyan()  { printf "\033[36m%s\033[0m\n" "$1"; }

cyan "=== 1. gpt-4o-mini ==="
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" -H "$SESSION" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Say hello in one word"}],"temperature":0}' \
  | jq -r '.choices[0].message.content // .error'
green "Done."

echo ""
cyan "=== 2. gpt-4o-mini (cache hit) ==="
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" -H "$SESSION" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Say hello in one word"}],"temperature":0}' \
  | jq -r '.choices[0].message.content // .error'
green "Done — should be a cache hit."

echo ""
cyan "=== 3. gpt-4o ==="
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" -H "$SESSION" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"Name 3 colors"}],"temperature":0}' \
  | jq -r '.choices[0].message.content // .error'
green "Done."

echo ""
cyan "=== 4. gpt-4.1-nano ==="
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" -H "$SESSION" \
  -d '{"model":"gpt-4.1-nano","messages":[{"role":"user","content":"What is 2+2?"}],"temperature":0}' \
  | jq -r '.choices[0].message.content // .error'
green "Done."

echo ""
cyan "=== 5. gpt-4.1-mini ==="
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" -H "$SESSION" \
  -d '{"model":"gpt-4.1-mini","messages":[{"role":"user","content":"What is the capital of France?"}],"temperature":0}' \
  | jq -r '.choices[0].message.content // .error'
green "Done."

echo ""
cyan "=== 6. Streaming (gpt-4o-mini) ==="
printf "  "
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Count to 5"}],"stream":true}' \
  | grep -o '"content":"[^"]*"' | sed 's/"content":"//;s/"//' | tr -d '\n'
echo ""
green "Done."

echo ""
green "=== Text demo complete (6 requests, 1 session) ==="
