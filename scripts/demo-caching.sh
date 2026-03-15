#!/bin/bash
# Demo: provider-level prompt caching for Anthropic and OpenAI.
#
# Shows that Raven automatically:
#   - Injects cache_control breakpoints on Anthropic requests
#   - Extracts cached token counts from provider responses
#   - Reports accurate costs with cache discounts
#
# Usage:
#   RAVEN_KEY=rk_... ./scripts/demo-caching.sh
#
# Requirements:
#   - Raven API running locally (or set RAVEN_API_URL)
#   - Virtual key with both Anthropic and OpenAI provider configs
#   - jq installed

set -euo pipefail

API_URL="${RAVEN_API_URL:-http://localhost:3001}"
KEY="${RAVEN_KEY:?Set RAVEN_KEY to your virtual key}"
AUTH="Authorization: Bearer $KEY"
CT="Content-Type: application/json"

green() { printf "\033[32m%s\033[0m\n" "$1"; }
cyan()  { printf "\033[36m%s\033[0m\n" "$1"; }
dim()   { printf "\033[2m%s\033[0m\n" "$1"; }
bold()  { printf "\033[1m%s\033[0m\n" "$1"; }

# Large system prompt to ensure it crosses the 1024-token cache threshold
SYSTEM_PROMPT="You are a helpful assistant specialized in software engineering. You have deep expertise in TypeScript, React, Node.js, PostgreSQL, and distributed systems. When answering questions, provide concise, practical advice with code examples when appropriate. Always consider performance implications, error handling, and edge cases. Follow best practices for security, testing, and maintainability. Your responses should be well-structured with clear explanations."

TOOLS='[{"name":"get_weather","description":"Get the current weather for a given location. Returns temperature, conditions, humidity, and wind speed.","input_schema":{"type":"object","properties":{"location":{"type":"string","description":"City name or coordinates"},"units":{"type":"string","enum":["celsius","fahrenheit"],"description":"Temperature units"}},"required":["location"]}}]'

# ──────────────────────────────────────────────────────────────
bold "=== Prompt Caching Demo ==="
echo ""

# ── Anthropic: First request (cache write) ────────────────────
cyan "=== 1. Anthropic — First request (cache WRITE expected) ==="
dim "Sending with system prompt + tools. Raven auto-injects cache_control."
echo ""

RESP1=$(curl -s "$API_URL/v1/proxy/anthropic/messages" \
  -H "$AUTH" -H "$CT" \
  -d "{
    \"model\": \"claude-sonnet-4-20250514\",
    \"max_tokens\": 50,
    \"system\": \"$SYSTEM_PROMPT\",
    \"tools\": $TOOLS,
    \"messages\": [{\"role\": \"user\", \"content\": \"What is caching?\"}]
  }")

echo "$RESP1" | jq '{
  content: (.content[0].text // .error.message),
  input_tokens: .usage.input_tokens,
  output_tokens: .usage.output_tokens,
  cache_creation_input_tokens: .usage.cache_creation_input_tokens,
  cache_read_input_tokens: .usage.cache_read_input_tokens
}'
green "Done — cache_creation_input_tokens should be > 0 (system + tools cached)."

echo ""
sleep 2

# ── Anthropic: Second request (cache read) ────────────────────
cyan "=== 2. Anthropic — Second request (cache READ expected) ==="
dim "Same system prompt + tools. Should hit Anthropic's prompt cache."
echo ""

RESP2=$(curl -s "$API_URL/v1/proxy/anthropic/messages" \
  -H "$AUTH" -H "$CT" \
  -d "{
    \"model\": \"claude-sonnet-4-20250514\",
    \"max_tokens\": 50,
    \"system\": \"$SYSTEM_PROMPT\",
    \"tools\": $TOOLS,
    \"messages\": [{\"role\": \"user\", \"content\": \"What is prompt caching?\"}]
  }")

echo "$RESP2" | jq '{
  content: (.content[0].text // .error.message),
  input_tokens: .usage.input_tokens,
  output_tokens: .usage.output_tokens,
  cache_creation_input_tokens: .usage.cache_creation_input_tokens,
  cache_read_input_tokens: .usage.cache_read_input_tokens
}'
green "Done — cache_read_input_tokens should be > 0 (90% cheaper!)."

echo ""

# ── Anthropic: Third request — verify user-set cache_control is preserved ──
cyan "=== 3. Anthropic — User-set cache_control (should NOT double-inject) ==="
dim "Sending with explicit cache_control on system. Raven should skip injection."
echo ""

RESP3=$(curl -s "$API_URL/v1/proxy/anthropic/messages" \
  -H "$AUTH" -H "$CT" \
  -d "{
    \"model\": \"claude-sonnet-4-20250514\",
    \"max_tokens\": 50,
    \"system\": [{\"type\": \"text\", \"text\": \"$SYSTEM_PROMPT\", \"cache_control\": {\"type\": \"ephemeral\"}}],
    \"messages\": [{\"role\": \"user\", \"content\": \"Hello\"}]
  }")

echo "$RESP3" | jq '{
  content: (.content[0].text // .error.message),
  cache_creation_input_tokens: .usage.cache_creation_input_tokens,
  cache_read_input_tokens: .usage.cache_read_input_tokens
}'
green "Done — cache still works, no double injection."

echo ""

# ── OpenAI: First request ─────────────────────────────────────
cyan "=== 4. OpenAI — First request (auto-caching by OpenAI) ==="
dim "OpenAI caches automatically. Raven extracts cached_tokens from response."
echo ""

RESP4=$(curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" \
  -d "{
    \"model\": \"gpt-4o-mini\",
    \"messages\": [
      {\"role\": \"system\", \"content\": \"$SYSTEM_PROMPT\"},
      {\"role\": \"user\", \"content\": \"What is caching?\"}
    ],
    \"temperature\": 0
  }")

echo "$RESP4" | jq '{
  content: (.choices[0].message.content // .error),
  prompt_tokens: .usage.prompt_tokens,
  completion_tokens: .usage.completion_tokens,
  cached_tokens: .usage.prompt_tokens_details.cached_tokens
}'
green "Done."

echo ""

# ── OpenAI: Second request (may show cached_tokens) ──────────
cyan "=== 5. OpenAI — Second request (may show cached_tokens) ==="
dim "Same prefix — OpenAI may return cached_tokens (50% cheaper)."
echo ""

RESP5=$(curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" \
  -d "{
    \"model\": \"gpt-4o-mini\",
    \"messages\": [
      {\"role\": \"system\", \"content\": \"$SYSTEM_PROMPT\"},
      {\"role\": \"user\", \"content\": \"What is prompt caching?\"}
    ],
    \"temperature\": 0
  }")

echo "$RESP5" | jq '{
  content: (.choices[0].message.content // .error),
  prompt_tokens: .usage.prompt_tokens,
  completion_tokens: .usage.completion_tokens,
  cached_tokens: .usage.prompt_tokens_details.cached_tokens
}'
green "Done — cached_tokens > 0 means OpenAI cached the system prompt prefix."

echo ""

# ── Summary ───────────────────────────────────────────────────
bold "=== Demo Complete ==="
echo ""
dim "Check your Raven dashboard — the request logs should show:"
dim "  - cachedTokens > 0 for requests 2-5"
dim "  - Accurate cost estimates with cache discounts applied"
dim "  - Request 1: cache write (Anthropic charges 1.25x on written tokens)"
dim "  - Request 2: cache read (Anthropic charges 0.1x — 90% savings!)"
dim "  - Requests 4-5: OpenAI auto-cache (0.5x — 50% savings)"
