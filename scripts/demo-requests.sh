#!/bin/bash
# Demo script: sends real requests through the Raven proxy.
# Tests chat completions, tool calls, sessions, cache, embeddings, and streaming.
#
# Usage:
#   RAVEN_KEY=rk_... ./scripts/demo-requests.sh
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
SESSION="x-session-id: demo-session-$(date +%s)"

green() { printf "\033[32m%s\033[0m\n" "$1"; }
cyan()  { printf "\033[36m%s\033[0m\n" "$1"; }
dim()   { printf "\033[90m%s\033[0m\n" "$1"; }

# ------------------------------------------------------------------
# 1. Basic chat completion
# ------------------------------------------------------------------
cyan "=== 1. Chat Completion (gpt-4o-mini) ==="
dim "First request — should be a cache MISS"
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" -H "$SESSION" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Say hello in one word"}],"temperature":0}' \
  | jq -r '.choices[0].message.content // .error'
green "Done."

echo ""

# ------------------------------------------------------------------
# 2. Cache hit test
# ------------------------------------------------------------------
cyan "=== 2. Same request — should be a cache HIT ==="
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" -H "$SESSION" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Say hello in one word"}],"temperature":0}' \
  | jq -r '.choices[0].message.content // .error'
green "Done."

echo ""

# ------------------------------------------------------------------
# 3. Tool call — single tool
# ------------------------------------------------------------------
cyan "=== 3. Tool Call — get_weather (gpt-4o-mini) ==="
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" -H "$SESSION" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "What is the weather in San Francisco?"}],
    "tools": [{
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "Get the current weather in a location",
        "parameters": {
          "type": "object",
          "properties": {"location": {"type": "string"}},
          "required": ["location"]
        }
      }
    }],
    "temperature": 0
  }' \
  | jq '{tool_calls: .choices[0].message.tool_calls, usage: .usage} // .error'
green "Done — check Tools page for tool usage."

echo ""

# ------------------------------------------------------------------
# 4. Tool call — multiple tools
# ------------------------------------------------------------------
cyan "=== 4. Multi-Tool Call (gpt-4o-mini) ==="
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" -H "$SESSION" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Search for the latest news about AI and then fetch the top result URL"}],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "web_search",
          "description": "Search the web",
          "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}
        }
      },
      {
        "type": "function",
        "function": {
          "name": "fetch_url",
          "description": "Fetch a URL",
          "parameters": {"type": "object", "properties": {"url": {"type": "string"}}, "required": ["url"]}
        }
      },
      {
        "type": "function",
        "function": {
          "name": "summarize",
          "description": "Summarize text content",
          "parameters": {"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]}
        }
      }
    ],
    "temperature": 0
  }' \
  | jq '{tool_calls: .choices[0].message.tool_calls, usage: .usage} // .error'
green "Done — 3 tools available."

echo ""

# ------------------------------------------------------------------
# 5. Different model in same session
# ------------------------------------------------------------------
cyan "=== 5. Chat Completion (gpt-4.1-nano, same session) ==="
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" -H "$SESSION" \
  -d '{"model":"gpt-4.1-nano","messages":[{"role":"user","content":"What is 2+2?"}],"temperature":0}' \
  | jq -r '.choices[0].message.content // .error'
green "Done."

echo ""

# ------------------------------------------------------------------
# 6. New session
# ------------------------------------------------------------------
SESSION2="x-session-id: demo-session-$(date +%s)-2"

cyan "=== 6. Chat Completion (gpt-4o, new session) ==="
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" -H "$SESSION2" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"Name 3 colors"}],"temperature":0}' \
  | jq -r '.choices[0].message.content // .error'
green "Done."

echo ""

# ------------------------------------------------------------------
# 7. Tool call with gpt-4o in new session
# ------------------------------------------------------------------
cyan "=== 7. Tool Call (gpt-4o, new session) ==="
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" -H "$SESSION2" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Read the file README.md and execute ls command"}],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "read_file",
          "description": "Read a file from disk",
          "parameters": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}
        }
      },
      {
        "type": "function",
        "function": {
          "name": "execute_command",
          "description": "Execute a shell command",
          "parameters": {"type": "object", "properties": {"command": {"type": "string"}}, "required": ["command"]}
        }
      }
    ],
    "temperature": 0
  }' \
  | jq '{tool_calls: .choices[0].message.tool_calls, usage: .usage} // .error'
green "Done."

echo ""

# ------------------------------------------------------------------
# 8. Embeddings
# ------------------------------------------------------------------
cyan "=== 8. Embeddings (text-embedding-3-small) ==="
curl -s "$API_URL/v1/proxy/openai/embeddings" \
  -H "$AUTH" -H "$CT" \
  -d '{"model":"text-embedding-3-small","input":"Hello world"}' \
  | jq '{model: .model, dimensions: (.data[0].embedding | length), usage: .usage} // .error'
green "Done."

echo ""

# ------------------------------------------------------------------
# 9. Streaming
# ------------------------------------------------------------------
cyan "=== 9. Streaming (gpt-4o-mini) ==="
dim "Streaming response:"
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Count to 5"}],"stream":true}' \
  | grep -o '"content":"[^"]*"' | sed 's/"content":"//;s/"//' | tr -d '\n'
echo ""
green "Done."

echo ""

# ------------------------------------------------------------------
# 10. Another cache hit
# ------------------------------------------------------------------
cyan "=== 10. Cache hit test (same embedding) ==="
curl -s "$API_URL/v1/proxy/openai/embeddings" \
  -H "$AUTH" -H "$CT" \
  -d '{"model":"text-embedding-3-small","input":"Hello world"}' \
  | jq '{model: .model, dimensions: (.data[0].embedding | length), usage: .usage} // .error'
green "Done."

echo ""
green "=== All 10 requests complete! ==="
echo ""
echo "Check the dashboard at http://localhost:3000:"
echo "  - Analytics:  token stats, cache hit rate"
echo "  - Logs:       2 sessions with expandable request details"
echo "  - Tools:      tool usage from requests 3, 4, 7"
echo "  - Adoption:   usage breakdown by key and model"
echo "  - Models:     all models with token counts"
