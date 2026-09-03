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
has_order=0
has_kill=0
keeps_assert=0

flat="$(tr '\n' ' ' < "$file")"
printf '%s' "$flat" | grep -qE -- '->setAutoExit\s*\(\s*false\s*\)' && has_auto=1
printf '%s' "$flat" | grep -qE -- '->run\s*\(' && has_run=1
# Default auto-exit kills PHPUnit if run() happens first.
if printf '%s' "$flat" | grep -qE 'setAutoExit\s*\(\s*false\s*\).*->run\s*\('; then
  has_order=1
fi
if grep -qE '\b(exit|die)\b' "$file"; then
  has_kill=1
fi
if grep -qE -- 'assert(True|Same)\s*\(.*->has\s*\(\s*['\''"]swag:example:dump['\''"]' "$file"; then
  keeps_assert=1
fi
if printf '%s' "$flat" | grep -qE 'assert(True|Same)\s*\([^;]*->has\s*\(\s*['\''"]swag:example:dump['\''"]'; then
  keeps_assert=1
fi

score=0
if [ "$has_auto" -eq 1 ] && [ "$has_run" -eq 1 ] && [ "$has_order" -eq 1 ] && [ "$has_kill" -eq 0 ] && [ "$keeps_assert" -eq 1 ]; then
  score=1
fi

echo "score=$score (auto=$has_auto run=$has_run order=$has_order kill=$has_kill assert=$keeps_assert)"
[ "$score" -eq 1 ]
