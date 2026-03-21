#!/bin/bash
# Demo: requests with tool calls (single, multi-tool, different models).
#
# Usage:
#   RAVEN_KEY=rk_... ./scripts/demo-toolcalls.sh

set -euo pipefail

API_URL="${RAVEN_API_URL:-http://localhost:4000}"
KEY="${RAVEN_KEY:?Set RAVEN_KEY to your virtual key}"
AUTH="Authorization: Bearer $KEY"
CT="Content-Type: application/json"
SESSION="x-session-id: tools-demo-$(date +%s)"

green() { printf "\033[32m%s\033[0m\n" "$1"; }
cyan()  { printf "\033[36m%s\033[0m\n" "$1"; }

cyan "=== 1. Single tool — get_weather (gpt-4o-mini) ==="
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" -H "$SESSION" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role":"user","content":"What is the weather in San Francisco?"}],
    "tools": [{
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "Get the current weather in a location",
        "parameters": {"type":"object","properties":{"location":{"type":"string"}},"required":["location"]}
      }
    }],
    "temperature": 0
  }' | jq '{tool_calls: .choices[0].message.tool_calls, usage: .usage} // .error'
green "Done — 1 tool."

echo ""
cyan "=== 2. Two tools — search + fetch (gpt-4o-mini) ==="
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" -H "$SESSION" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role":"user","content":"Search for AI news and fetch the top result"}],
    "tools": [
      {"type":"function","function":{"name":"web_search","description":"Search the web","parameters":{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}}},
      {"type":"function","function":{"name":"fetch_url","description":"Fetch a URL","parameters":{"type":"object","properties":{"url":{"type":"string"}},"required":["url"]}}}
    ],
    "temperature": 0
  }' | jq '{tool_calls: .choices[0].message.tool_calls, usage: .usage} // .error'
green "Done — 2 tools."

echo ""
cyan "=== 3. Five tools — coding agent (gpt-4o) ==="
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" -H "$SESSION" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role":"user","content":"Read the file main.py, fix the bug, write the fix, run the tests, and commit"}],
    "tools": [
      {"type":"function","function":{"name":"read_file","description":"Read a file","parameters":{"type":"object","properties":{"path":{"type":"string"}},"required":["path"]}}},
      {"type":"function","function":{"name":"write_file","description":"Write a file","parameters":{"type":"object","properties":{"path":{"type":"string"},"content":{"type":"string"}},"required":["path","content"]}}},
      {"type":"function","function":{"name":"execute_command","description":"Run a shell command","parameters":{"type":"object","properties":{"command":{"type":"string"}},"required":["command"]}}},
      {"type":"function","function":{"name":"search_code","description":"Search codebase","parameters":{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}}},
      {"type":"function","function":{"name":"git_commit","description":"Create a git commit","parameters":{"type":"object","properties":{"message":{"type":"string"}},"required":["message"]}}}
    ],
    "temperature": 0
  }' | jq '{tool_calls: .choices[0].message.tool_calls, usage: .usage} // .error'
green "Done — 5 tools."

echo ""
cyan "=== 4. Tool call with different model (gpt-4.1-mini) ==="
SESSION2="x-session-id: tools-demo-$(date +%s)-2"
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" -H "$SESSION2" \
  -d '{
    "model": "gpt-4.1-mini",
    "messages": [{"role":"user","content":"Query the database for all users"}],
    "tools": [
      {"type":"function","function":{"name":"sql_query","description":"Execute a SQL query","parameters":{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}}},
      {"type":"function","function":{"name":"format_table","description":"Format query results as a table","parameters":{"type":"object","properties":{"data":{"type":"string"}},"required":["data"]}}}
    ],
    "temperature": 0
  }' | jq '{tool_calls: .choices[0].message.tool_calls, usage: .usage} // .error'
green "Done — 2 tools, new session."

echo ""
cyan "=== 5. Tool call (gpt-4.1-nano) ==="
curl -s "$API_URL/v1/proxy/openai/chat/completions" \
  -H "$AUTH" -H "$CT" -H "$SESSION2" \
  -d '{
    "model": "gpt-4.1-nano",
    "messages": [{"role":"user","content":"Calculate the sum of 1 to 100"}],
    "tools": [
      {"type":"function","function":{"name":"calculator","description":"Evaluate a math expression","parameters":{"type":"object","properties":{"expression":{"type":"string"}},"required":["expression"]}}}
    ],
    "temperature": 0
  }' | jq '{tool_calls: .choices[0].message.tool_calls, usage: .usage} // .error'
green "Done."

echo ""
green "=== Tool calls demo complete (5 requests, 2 sessions, 1-5 tools each) ==="
