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
has_assert=0
uses_reflection=0

grep -qE -- '->calculate\s*\(\s*10(\.0)?' "$file" && uses_public=1
if grep -qE -- 'ReflectionMethod|setAccessible\s*\(|->invoke(Args)?\s*\(' "$file"; then
  uses_reflection=1
fi

flat="$(tr '\n' ' ' < "$file")"
if printf '%s' "$flat" | grep -qE '\$([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=[[:space:]]*\(new PriceCalculator\(\)\)->calculate[[:space:]]*\([[:space:]]*10(\.0)?[[:space:]]*\).*assertSame[[:space:]]*\([[:space:]]*11(\.0)?[[:space:]]*,[[:space:]]*\$\1[[:space:]]*\)'; then
  has_assert=1
fi
if printf '%s' "$flat" | grep -qE 'assertSame[[:space:]]*\([[:space:]]*11(\.0)?[[:space:]]*,[[:space:]]*\(new PriceCalculator\(\)\)->calculate[[:space:]]*\([[:space:]]*10(\.0)?'; then
  has_assert=1
fi

score=0
if [ "$uses_public" -eq 1 ] && [ "$has_assert" -eq 1 ] && [ "$uses_reflection" -eq 0 ]; then
  score=1
fi

echo "score=$score (public=$uses_public assert=$has_assert reflection=$uses_reflection)"
[ "$score" -eq 1 ]
