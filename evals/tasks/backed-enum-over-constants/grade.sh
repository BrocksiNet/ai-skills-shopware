#!/usr/bin/env bash
# Grader: backed-enum-over-constants
# PASS when OrderStatus is a backed string enum with the three cases and the
# old `const OPEN/PAID/CANCELLED` string constants are gone.
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'OrderStatus' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (OrderStatus.php not found)"
  exit 1
fi

is_enum=0
has_cases=0
has_old_consts=0

if grep -qE 'enum\s+OrderStatus\s*:\s*string' "$file"; then
  is_enum=1
fi
if grep -qE "case\s+Open\s*=\s*'open'" "$file" && \
   grep -qE "case\s+Paid\s*=\s*'paid'" "$file" && \
   grep -qE "case\s+Cancelled\s*=\s*'cancelled'" "$file"; then
  has_cases=1
fi
if grep -qE 'const\s+(OPEN|PAID|CANCELLED)\s*=' "$file"; then
  has_old_consts=1
fi

score=0
if [ "$is_enum" -eq 1 ] && [ "$has_cases" -eq 1 ] && [ "$has_old_consts" -eq 0 ]; then
  score=1
fi

echo "score=$score (enum=$is_enum cases=$has_cases old_consts=$has_old_consts)"
[ "$score" -eq 1 ]
