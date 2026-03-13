#!/bin/bash
# Demo: reasoning model requests (o3-mini, o1-mini).
#
# Usage:
#   RAVEN_KEY=rk_... ./scripts/demo-reasoning.sh

set -euo pipefail

API_URL="${RAVEN_API_URL:-http://localhost:3001}"
KEY="${RAVEN_KEY:?Set RAVEN_KEY to your virtual key}"
AUTH="Authorization: Bearer $KEY"
CT="Content-Type: application/json"
SESSION="x-session-id: reasoning-demo-$(date +%s)"

green() { printf "\033[32m%s\033[0m\n" "$1"; }
cyan()  { printf "\033[36m%s\033[0m\n" "$1"; }

cyan "=== 1. o3-mini — math problem ==="
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" -H "$SESSION" \
  -d '{
    "model": "o3-mini",
    "messages": [{"role":"user","content":"What is the sum of all prime numbers less than 50?"}]
  }' | jq '{content: .choices[0].message.content, usage: .usage} // .error'
green "Done."

echo ""
cyan "=== 2. o3-mini — logic puzzle ==="
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" -H "$SESSION" \
  -d '{
    "model": "o3-mini",
    "messages": [{"role":"user","content":"If all roses are flowers and some flowers fade quickly, can we conclude that some roses fade quickly? Explain step by step."}]
  }' | jq '{content: .choices[0].message.content, usage: .usage} // .error'
green "Done."

echo ""
cyan "=== 3. o3-mini — coding problem ==="
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" -H "$SESSION" \
  -d '{
    "model": "o3-mini",
    "messages": [{"role":"user","content":"Write a function to check if a binary tree is balanced. Analyze the time and space complexity."}]
  }' | jq '{content: (.choices[0].message.content | .[0:200]), usage: .usage} // .error'
green "Done."

echo ""
cyan "=== 4. o3-mini with tools ==="
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" -H "$SESSION" \
  -d '{
    "model": "o3-mini",
    "messages": [{"role":"user","content":"Calculate the factorial of 20 and verify it"}],
    "tools": [
      {"type":"function","function":{"name":"calculator","description":"Evaluate a math expression","parameters":{"type":"object","properties":{"expression":{"type":"string"}},"required":["expression"]}}}
    ]
  }' | jq '{tool_calls: .choices[0].message.tool_calls, usage: .usage} // .error'
green "Done — reasoning + tools."

echo ""
green "=== Reasoning demo complete (4 requests, 1 session) ==="
echo "Check Analytics for reasoning token counts."
