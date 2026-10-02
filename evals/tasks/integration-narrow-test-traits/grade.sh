#!/usr/bin/env bash
# Grader: integration-narrow-test-traits
set -euo pipefail

# shellcheck source=../../grade-helpers.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/grade-helpers.sh"

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'class ProductRepositoryTest' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (ProductRepositoryTest.php not found)"
  exit 1
fi

body="$(grade_without_comments "$file")"
broad=0
kernel=0
tx=0

printf '%s\n' "$body" | grep -q 'IntegrationTestBehaviour' && broad=1
printf '%s\n' "$body" | grep -q 'KernelTestBehaviour' && kernel=1
printf '%s\n' "$body" | grep -q 'DatabaseTransactionBehaviour' && tx=1

score=0
if [ "$broad" -eq 0 ] && [ "$kernel" -eq 1 ] && [ "$tx" -eq 1 ]; then
  score=1
fi

echo "score=$score (broad=$broad kernel=$kernel tx=$tx)"
[ "$score" -eq 1 ]
