#!/usr/bin/env bash
# Grader: test-no-exit-die
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'ConsoleCommandTest' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (ConsoleCommandTest.php not found)"
  exit 1
fi

has_auto=0
has_run=0
has_kill=0
keeps_assert=0

grep -qE -- '->setAutoExit\s*\(\s*false\s*\)' "$file" && has_auto=1
grep -qE -- '->run\s*\(' "$file" && has_run=1
if grep -qE '\b(exit|die)\s*\(' "$file"; then
  has_kill=1
fi
grep -q 'swag:example:dump' "$file" && keeps_assert=1

score=0
if [ "$has_auto" -eq 1 ] && [ "$has_run" -eq 1 ] && [ "$has_kill" -eq 0 ] && [ "$keeps_assert" -eq 1 ]; then
  score=1
fi

echo "score=$score (auto=$has_auto run=$has_run kill=$has_kill assert=$keeps_assert)"
[ "$score" -eq 1 ]
