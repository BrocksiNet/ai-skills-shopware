#!/usr/bin/env bash
#
# Layer 3 runner: A/B ablation for one task. Runs it with the skill set ON
# and OFF, prints the comparison, and appends one JSON line to $EVAL_RESULTS.
#
#   ./ab.sh <task-name> [repeats]
#
# A skill that does not change the pass rate is not earning its context budget.
#
# A real A/B needs SKILLS_PROFILE_CMD (or the legacy ON/OFF hooks); without
# one, "on" and "off" load the same skills and the run is refused.
#
# Verdicts and exit codes:
#   improved       on > off                          exit 0
#   held           on == off == repeats              exit 11
#   no_difference  on == off < repeats               exit 10
#   worse          on < off                          exit 20
#   error          an agent error in any run         exit 5
#   usage error / no profile command                 exit 2
#   SKILLS_AGENT_CMD not set                         exit 3
#
# Env:
#   EVAL_RESULTS  JSONL output (default: <repo>/evals/.results/ab.jsonl)
#   EVAL_AGENT    label for the agent column (default: adapter name, e.g.
#                 `opencode` for opencode-task.sh)
#   TASK_MODEL    recorded as the model column (default: "default")
set -euo pipefail

TASK="${1:?usage: ab.sh <task-name> [repeats]}"
REPEATS="${2:-1}"
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"

[[ "$REPEATS" =~ ^[1-9][0-9]*$ ]] || { echo "repeats must be a positive integer" >&2; exit 2; }
[ -d "$ROOT/evals/tasks/$TASK" ] || { echo "Unknown task: $TASK" >&2; exit 2; }
if [ -z "${SKILLS_AGENT_CMD:-}" ]; then
  echo "SKILLS_AGENT_CMD not set -> cannot run the A/B." >&2
  exit 3
fi
if [ -z "${SKILLS_PROFILE_CMD:-}" ] && [ -z "${SKILLS_PROFILE_ON_CMD:-}${SKILLS_PROFILE_OFF_CMD:-}" ]; then
  echo "No SKILLS_PROFILE_CMD: 'on' and 'off' would load the same skills. Refusing." >&2
  echo "Use: SKILLS_PROFILE_CMD=$HERE/skills-profile.sh" >&2
  exit 2
fi

RESULTS="${EVAL_RESULTS:-$ROOT/evals/.results/ab.jsonl}"
mkdir -p "$(dirname "$RESULTS")"

run_n() { # $1 = mode ; prints "<passes> <agent errors>"
  local mode="$1" pass=0 err=0 i rc
  for i in $(seq 1 "$REPEATS"); do
    rc=0
    "$HERE/run-task.sh" "$TASK" "$mode" >/dev/null 2>&1 || rc=$?
    case "$rc" in
      0) pass=$((pass + 1)) ;;
      1) ;;
      *) err=$((err + 1)) ;;
    esac
  done
  echo "$pass $err"
}

read -r on_pass on_err < <(run_n on)
read -r off_pass off_err < <(run_n off)
errors=$((on_err + off_err))

if [ "$errors" -gt 0 ]; then
  verdict=error; code=5
elif [ "$on_pass" -gt "$off_pass" ]; then
  verdict=improved; code=0
elif [ "$on_pass" -lt "$off_pass" ]; then
  verdict=worse; code=20
elif [ "$on_pass" -eq "$REPEATS" ]; then
  verdict=held; code=11
else
  verdict=no_difference; code=10
fi

agent="${EVAL_AGENT:-$(basename "${SKILLS_AGENT_CMD%% *}" .sh)}"
agent="${agent%-task}"
sha="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf '{"task":"%s","repeats":%d,"on":%d,"off":%d,"errors":%d,"delta":%d,"verdict":"%s","agent":"%s","model":"%s","sha":"%s","ts":"%s"}\n' \
  "$TASK" "$REPEATS" "$on_pass" "$off_pass" "$errors" "$((on_pass - off_pass))" "$verdict" \
  "$agent" "${TASK_MODEL:-default}" "$sha" "$ts" >>"$RESULTS"

echo "Task: $TASK  (repeats=$REPEATS)"
echo "  skill ON : $on_pass/$REPEATS passed"
echo "  skill OFF: $off_pass/$REPEATS passed"
case "$verdict" in
  improved)      echo "  => skill IMPROVES the result (earns its budget)." ;;
  held)          echo "  => both pass every run. The model may not need this rule." ;;
  no_difference) echo "  => no measurable difference. Re-examine whether this rule is needed/tested." ;;
  worse)         echo "  => skill made it WORSE. Investigate immediately." ;;
  error)         echo "  => $errors agent error(s); no verdict. Rerun once the provider is available." ;;
esac
exit "$code"
