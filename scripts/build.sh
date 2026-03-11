#!/usr/bin/env bash
set -euo pipefail
# Build the Raven gateway binary
VERSION="${VERSION:-$(git describe --tags --always --dirty 2>/dev/null || echo dev)}"
echo "Building Raven ${VERSION}..."
cd "$(dirname "$0")/../gateway"
CGO_ENABLED=1 go build -ldflags "-s -w -X main.version=${VERSION}" -o raven .
echo "Built: gateway/raven"
