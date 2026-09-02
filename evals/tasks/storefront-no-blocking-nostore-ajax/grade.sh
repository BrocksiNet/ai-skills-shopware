#!/usr/bin/env bash
# Grader: storefront-no-blocking-nostore-ajax
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"

has_plugin=0
has_nostore=0
has_blocking_fetch=0

grep -rqE --include='*.js' 'extends Plugin' "$WORKDIR" && has_plugin=1
if grep -rqE --include='*.js' "cache:\s*['\"]no-store['\"]" "$WORKDIR"; then
  has_nostore=1
fi
if grep -rqE --include='*.js' 'fetch\s*\(' "$WORKDIR" && grep -rqE --include='*.js' 'init\s*\(' "$WORKDIR"; then
  # fetch inside a listing plugin init is the blocking case we reject with no-store
  if [ "$has_nostore" -eq 1 ]; then
    has_blocking_fetch=1
  fi
fi

score=0
if [ "$has_plugin" -eq 1 ] && [ "$has_nostore" -eq 0 ] && [ "$has_blocking_fetch" -eq 0 ]; then
  score=1
fi

echo "score=$score (plugin=$has_plugin nostore=$has_nostore blocking=$has_blocking_fetch)"
[ "$score" -eq 1 ]
