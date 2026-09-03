#!/usr/bin/env bash
# Grader: one-covers-class-per-file
set -euo pipefail

# shellcheck source=../../grade-helpers.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/grade-helpers.sh"

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'CartNormalizerTest' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (CartNormalizerTest.php not found)"
  exit 1
fi

covers_normalizer=0
covers_helper=0
covers_count=0

code="$(grade_without_comments "$file")"
printf '%s' "$code" | grep -q '#\[CoversClass(CartNormalizer::class)\]' && covers_normalizer=1
printf '%s' "$code" | grep -q '#\[CoversClass(LineItemHelper::class)\]' && covers_helper=1
covers_count="$(printf '%s' "$code" | grep -cE '#\[CoversClass\(' || true)"

score=0
if [ "$covers_normalizer" -eq 1 ] && [ "$covers_helper" -eq 0 ] && [ "$covers_count" -eq 1 ]; then
  score=1
fi

echo "score=$score (covers_normalizer=$covers_normalizer covers_helper=$covers_helper covers_count=$covers_count)"
[ "$score" -eq 1 ]
