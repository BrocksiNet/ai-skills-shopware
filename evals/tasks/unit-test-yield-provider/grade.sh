#!/usr/bin/env bash
# Grader: unit-test-yield-provider
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'PriceCalculatorTest' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (PriceCalculatorTest.php not found)"
  exit 1
fi

uses_yield=0
uses_return_array=0
uses_yield_from=0

grep -qE '\byield\s+' "$file" && uses_yield=1
grep -qE 'return\s*\[' "$file" && uses_return_array=1
grep -qE 'yield\s+from' "$file" && uses_yield_from=1

score=0
if [ "$uses_yield" -eq 1 ] && [ "$uses_return_array" -eq 0 ] && [ "$uses_yield_from" -eq 0 ]; then
  score=1
fi

echo "score=$score (yield=$uses_yield return_array=$uses_return_array yield_from=$uses_yield_from)"
[ "$score" -eq 1 ]
