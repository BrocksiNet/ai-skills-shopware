#!/usr/bin/env bash
# Grader: test-docblock-use-see
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'McpStorefrontServiceConfigTest' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (McpStorefrontServiceConfigTest.php not found)"
  exit 1
fi

has_see=0
has_use=0
has_fqcn_prose=0

grep -q '@see McpDiscoveryScanDirsConfigTest' "$file" && has_see=1
grep -q 'use Shopware\\Tests\\Unit\\Core\\Framework\\Mcp\\McpDiscoveryScanDirsConfigTest' "$file" && has_use=1
grep -q '\\Shopware\\Tests\\Unit\\Core\\Framework\\Mcp\\McpDiscoveryScanDirsConfigTest' "$file" && has_fqcn_prose=1

score=0
if [ "$has_see" -eq 1 ] && [ "$has_use" -eq 1 ] && [ "$has_fqcn_prose" -eq 0 ]; then
  score=1
fi

echo "score=$score (see=$has_see use=$has_use fqcn_prose=$has_fqcn_prose)"
[ "$score" -eq 1 ]
