#!/usr/bin/env bash
# Grader: dal-search-without-limit
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'ProductLoader' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (ProductLoader.php not found)"
  exit 1
fi

uses_repo=0
has_limit=0

grep -qE 'EntityRepository|->search\s*\(' "$file" && uses_repo=1
grep -qE 'setLimit\s*\(' "$file" && has_limit=1

score=0
if [ "$uses_repo" -eq 1 ] && [ "$has_limit" -eq 1 ]; then
  score=1
fi

echo "score=$score (repo=$uses_repo limit=$has_limit)"
[ "$score" -eq 1 ]
