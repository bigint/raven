#!/usr/bin/env bash
set -euo pipefail
# Generate a new provider YAML spec scaffold
NAME="${1:?Usage: generate-provider.sh <provider-name>}"
SPEC_DIR="$(dirname "$0")/../gateway/internal/providers/specs"
FILE="${SPEC_DIR}/${NAME}.yaml"

if [ -f "$FILE" ]; then
  echo "Provider spec already exists: $FILE"
  exit 1
fi

cat > "$FILE" << EOF
name: ${NAME}
display_name: ${NAME^}
base_url: https://api.${NAME}.com/v1
auth_type: bearer
compatible_with: openai
models:
  - id: model-name
    context_window: 128000
    input_price_per_1m: 1.00
    output_price_per_1m: 3.00
    supports_streaming: true
    supports_tools: true
    supports_vision: false
EOF

echo "Created provider spec: $FILE"
echo "Edit it with your provider's details."
