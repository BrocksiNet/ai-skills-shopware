#!/usr/bin/env bash
# Grader: no-reflection-on-shopware-method
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'PriceCalculatorTest' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (PriceCalculatorTest.php not found)"
  exit 1
fi

uses_public=0
uses_reflection=0

grep -qE -- '->calculate\s*\(' "$file" && uses_public=1
if grep -qE -- 'ReflectionMethod|setAccessible\s*\(|->invoke(Args)?\s*\(' "$file"; then
  uses_reflection=1
fi

score=0
if [ "$uses_public" -eq 1 ] && [ "$uses_reflection" -eq 0 ]; then
  score=1
fi

echo "score=$score (public=$uses_public reflection=$uses_reflection)"
[ "$score" -eq 1 ]
