#!/usr/bin/env bash
# Grader: no-access-key-in-source
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'StoreApiConfig' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (StoreApiConfig.php not found)"
  exit 1
fi

hardcoded=0
uses_env=0

# 32-char hex typical for sales channel access keys
if grep -qE "['\"]SWSC[A-Z0-9]{28,}['\"]|accessKey\s*=\s*['\"][0-9a-fA-F]{32}['\"]" "$file"; then
  hardcoded=1
fi

if grep -qE 'getenv\s*\(|%env\(|EnvironmentInterface|$_ENV' "$file"; then
  uses_env=1
fi

score=0
if [ "$hardcoded" -eq 0 ] && [ "$uses_env" -eq 1 ]; then
  score=1
fi

echo "score=$score (hardcoded=$hardcoded env=$uses_env)"
[ "$score" -eq 1 ]
