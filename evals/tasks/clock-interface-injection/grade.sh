#!/usr/bin/env bash
# Grader: clock-interface-injection
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'TokenExpiryChecker' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (TokenExpiryChecker.php not found)"
  exit 1
fi

uses_clock=0
uses_time=0
has_constructor_injection=0

grep -qE 'ClockInterface' "$file" && uses_clock=1
if grep -qE 'ClockInterface' "$file" && grep -qE '__construct|readonly\s+ClockInterface|ClockInterface\s+\$' "$file"; then
  has_constructor_injection=1
fi
grep -qE '\btime\s*\(' "$file" && uses_time=1
grep -qE '\bdate\s*\(' "$file" && uses_time=1

score=0
if [ "$uses_clock" -eq 1 ] && [ "$has_constructor_injection" -eq 1 ] && [ "$uses_time" -eq 0 ]; then
  score=1
fi

echo "score=$score (clock=$uses_clock inject=$has_constructor_injection time_or_date=$uses_time)"
[ "$score" -eq 1 ]
