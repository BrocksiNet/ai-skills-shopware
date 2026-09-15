#!/usr/bin/env bash
# Grader: unit-test-disable-newer-major
set -euo pipefail

# shellcheck source=../../grade-helpers.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/grade-helpers.sh"

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'CartRoundingTest' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (CartRoundingTest.php not found)"
  exit 1
fi

has_disable=0
has_fake=0

code="$(grade_without_comments "$file")"
printf '%s' "$code" | grep -qE '#\[DisabledFeatures\(\[.*v6\.9\.0\.0' && has_disable=1
printf '%s' "$code" | grep -qE 'Feature::fake\s*\(' && has_fake=1

score=0
if [ "$has_disable" -eq 1 ] && [ "$has_fake" -eq 0 ]; then
  score=1
fi

echo "score=$score (disable=$has_disable fake=$has_fake)"
[ "$score" -eq 1 ]
