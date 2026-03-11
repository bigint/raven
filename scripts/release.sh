#!/usr/bin/env bash
set -euo pipefail
# Cut a new release
VERSION="${1:?Usage: release.sh <version>}"

if [[ ! "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Version must be in format v0.0.0"
  exit 1
fi

echo "Releasing ${VERSION}..."
git tag -a "$VERSION" -m "Release ${VERSION}"
git push origin "$VERSION"
echo "Release ${VERSION} tagged and pushed."
echo "GitHub Actions will handle the rest."
