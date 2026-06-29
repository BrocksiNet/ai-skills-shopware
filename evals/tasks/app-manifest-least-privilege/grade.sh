#!/usr/bin/env bash
# Grader: app-manifest-least-privilege
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='manifest.xml' '.' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (manifest.xml not found)"
  exit 1
fi

has_wildcard=0
has_specific=0

if grep -qE '<create>all</create>|<read>all</read>|<update>all</update>|<delete>all</delete>' "$file"; then
  has_wildcard=1
fi

if grep -q 'product:read' "$file" && grep -q 'order:read' "$file"; then
  has_specific=1
fi

score=0
if [ "$has_wildcard" -eq 0 ] && [ "$has_specific" -eq 1 ]; then
  score=1
fi

echo "score=$score (wildcard=$has_wildcard specific=$has_specific)"
[ "$score" -eq 1 ]
