#!/usr/bin/env bash
# Grader: no-empty-explicit — php-foundation trunk habit (review-backed).
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'UserValidator' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (UserValidator.php not found)"
  exit 1
fi

uses_empty=0
has_explicit=0

if grep -qE '\bempty\s*\(' "$file"; then
  uses_empty=1
fi
if grep -qE "=== ''|=== null|!== ''|!== null" "$file"; then
  has_explicit=1
fi

score=0
if [ "$uses_empty" -eq 0 ] && [ "$has_explicit" -eq 1 ]; then
  score=1
fi

echo "score=$score (uses_empty=$uses_empty explicit_check=$has_explicit)"
[ "$score" -eq 1 ]
