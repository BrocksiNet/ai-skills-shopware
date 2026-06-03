#!/usr/bin/env bash
#
# Layer 3 runner: A/B ablation for one task. Runs it with the skill set ON
# and OFF and reports whether the skill moved the result.
#
#   ./ab.sh <task-name> [repeats]
#
# A skill that does not change the pass rate is not earning its context budget.
set -euo pipefail

TASK="${1:?usage: ab.sh <task-name> [repeats]}"
REPEATS="${2:-1}"
HERE="$(cd "$(dirname "$0")" && pwd)"

run_n() { # $1 mode
  local mode="$1" pass=0 i
  for i in $(seq 1 "$REPEATS"); do
    if "$HERE/run-task.sh" "$TASK" "$mode" >/dev/null 2>&1; then
      pass=$((pass+1))
    fi
  done
  echo "$pass"
}

on_pass="$(run_n on)"
off_pass="$(run_n off)"

echo "Task: $TASK  (repeats=$REPEATS)"
echo "  skill ON : $on_pass/$REPEATS passed"
echo "  skill OFF: $off_pass/$REPEATS passed"
if [ "$on_pass" -gt "$off_pass" ]; then
  echo "  => skill IMPROVES the result (earns its budget)."
elif [ "$on_pass" -eq "$off_pass" ]; then
  echo "  => no measurable difference. Re-examine whether this rule is needed/tested."
else
  echo "  => skill made it WORSE. Investigate immediately."
fi
