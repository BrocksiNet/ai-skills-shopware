#!/usr/bin/env bash
# Grader: named-arguments-for-literals
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'SnippetLoader' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (SnippetLoader.php not found)"
  exit 1
fi

has_named=0
has_bare=0
keeps_count=0

grep -qE 'dump\s*\(\s*strict:\s*true\s*,\s*limit:\s*0\s*,\s*fallback:\s*null\s*\)' "$file" && has_named=1
if grep -qE 'dump\s*\(\s*true\s*,\s*0\s*,\s*null\s*\)' "$file"; then
  has_bare=1
fi
grep -qE 'count\s*\(\s*\$items\s*\)' "$file" && keeps_count=1

score=0
if [ "$has_named" -eq 1 ] && [ "$has_bare" -eq 0 ] && [ "$keeps_count" -eq 1 ]; then
  score=1
fi

echo "score=$score (named=$has_named bare=$has_bare count=$keeps_count)"
[ "$score" -eq 1 ]
