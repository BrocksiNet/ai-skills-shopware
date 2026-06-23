#!/usr/bin/env bash
# Grader: integration-no-covers-class
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'ProductLoaderIntegrationTest' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (ProductLoaderIntegrationTest.php not found)"
  exit 1
fi

has_integration=0
has_covers=0

grep -qE 'IntegrationTestBehaviour' "$file" && has_integration=1
grep -qE 'CoversClass|CoversFunction|CoversNothing' "$file" && has_covers=1

score=0
if [ "$has_integration" -eq 1 ] && [ "$has_covers" -eq 0 ]; then
  score=1
fi

echo "score=$score (integration=$has_integration covers_attr=$has_covers)"
[ "$score" -eq 1 ]
