#!/usr/bin/env bash
# Grader: store-api-openapi-required
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'ExampleRoute' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (ExampleRoute.php not found)"
  exit 1
fi

has_route=0
has_openapi=0

grep -qE 'Route\s*\(|#\[Route' "$file" && has_route=1
grep -qE 'OpenApi\\|use OpenApi' "$file" && has_openapi=1

score=0
if [ "$has_route" -eq 1 ] && [ "$has_openapi" -eq 1 ]; then
  score=1
fi

echo "score=$score (route=$has_route openapi=$has_openapi)"
[ "$score" -eq 1 ]
