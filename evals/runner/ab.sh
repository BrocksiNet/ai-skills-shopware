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
# Pass rates count completed runs only; an agent error is not a failed task.
# A gap smaller than EVAL_AB_MIN_DELTA_PCT points (default 50) is noise: with 3
# repeats, one run is 33 points, so "improved" and "worse" need two runs.
#
# Verdicts and exit codes:
#   improved       on rate - off rate >= min delta   exit 0
#   held           every completed run passed        exit 11
#   no_difference  gap below the min delta           exit 10
#   worse          off rate - on rate >= min delta   exit 20
#   error          fewer than half of the runs of a
#                  mode completed                    exit 5
#   usage error / no profile command                 exit 2
#   SKILLS_AGENT_CMD not set                         exit 3
#
# Env:
#   EVAL_RESULTS  JSONL output (default: <repo>/evals/.results/ab.jsonl)
#   EVAL_AGENT    label for the agent column (default: adapter name, e.g.
#                 `opencode` for opencode-task.sh)
#   TASK_MODEL    recorded as the model column (default: "default")
#
# Skill loads: ab.sh gives every run its own EVAL_SKILLS_LOG file. Adapters
# that support it (opencode-task.sh, claude-task.sh) list the skills they
# loaded there. "loaded_on" counts skill-on runs that loaded one of the task's
# skills; "loaded_off" counts skill-off runs that loaded any repo skill, which
# means skills leaked into the baseline. Both are null for adapters that do
# not report.
#
# Tokens: every run also gets EVAL_USAGE_LOG. Adapters write "<input> <output>"
# there. "tokens_on" / "tokens_off" are the averages over completed runs that
# reported, {"input":N,"output":N,"runs":N}, or null when none did.
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

# Skills a run counts as "loaded" for: the task's `skills` file, else all.
if [ -f "$ROOT/evals/tasks/$TASK/skills" ]; then
  expected="$(grep -v '^#' "$ROOT/evals/tasks/$TASK/skills" | grep -v '^[[:space:]]*$' || true)"
else
  expected="$(find "$ROOT/skills" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort)"
fi
all_skills="$(find "$ROOT/skills" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort)"
logs="$(mktemp -d "${TMPDIR:-/tmp}/ab-skills.XXXXXX")"
trap 'rm -rf "$logs"' EXIT

# $1 = mode ; prints "<passes> <agent errors> <runs that loaded a skill> <runs reported>
#                     <input tokens> <output tokens> <runs with tokens>"
# "on" counts runs that loaded one of the task's skills; "off" counts runs that
# loaded any repo skill, which means skills leaked into the baseline.
run_n() {
  local mode="$1" pass=0 err=0 loaded=0 reported=0 i rc log match
  local tok_in=0 tok_out=0 tok_runs=0 usage u_in u_out
  match="$expected"
  [ "$mode" = off ] && match="$all_skills"
  for i in $(seq 1 "$REPEATS"); do
    rc=0
    log="$logs/$mode-$i"
    usage="$logs/$mode-$i.usage"
    EVAL_SKILLS_LOG="$log" EVAL_USAGE_LOG="$usage" \
      "$HERE/run-task.sh" "$TASK" "$mode" >/dev/null 2>"$logs/$mode-$i.err" || rc=$?
    # Agent errors and retries go to stderr (CI log); stdout stays the summary.
    grep -h -- '----- agent error' "$logs/$mode-$i.err" >&2 || true
    case "$rc" in
      0) pass=$((pass + 1)) ;;
      1) ;;
      *) err=$((err + 1)) ;;
    esac
    # Tokens of completed runs only; an agent error says nothing about the skill.
    if [ "$rc" -le 1 ] && [ -s "$usage" ]; then
      read -r u_in u_out < <(awk '{ i += $1; o += $2 } END { printf "%d %d\n", i, o }' "$usage")
      tok_in=$((tok_in + u_in)); tok_out=$((tok_out + u_out)); tok_runs=$((tok_runs + 1))
    fi
    if [ -f "$log" ]; then
      reported=$((reported + 1))
      if [ -n "$match" ] && grep -qxF -f <(printf '%s\n' "$match") "$log"; then
        loaded=$((loaded + 1))
      fi
    fi
  done
  echo "$pass $err $loaded $reported $tok_in $tok_out $tok_runs"
}

# $1 input sum ; $2 output sum ; $3 runs -> JSON average or null
tokens_json() {
  if [ "$3" -gt 0 ]; then
    printf '{"input":%d,"output":%d,"runs":%d}' $(( ($1 + $3 / 2) / $3 )) $(( ($2 + $3 / 2) / $3 )) "$3"
  else
    printf null
  fi
}
# $1 = tokens JSON -> "input/output" or n/a
tokens_text() {
  if [ "$1" = null ]; then echo n/a; else jq -r '"\(.input)/\(.output)"' <<<"$1"; fi
}

read -r on_pass on_err on_loaded on_reported on_tin on_tout on_truns < <(run_n on)
read -r off_pass off_err off_loaded off_reported off_tin off_tout off_truns < <(run_n off)
tokens_on="$(tokens_json "$on_tin" "$on_tout" "$on_truns")"
tokens_off="$(tokens_json "$off_tin" "$off_tout" "$off_truns")"
errors=$((on_err + off_err))
# null when the adapter does not report skill loads (no EVAL_SKILLS_LOG support)
if [ "$on_reported" -gt 0 ]; then loaded_on="$on_loaded"; else loaded_on=null; fi
if [ "$off_reported" -gt 0 ]; then loaded_off="$off_loaded"; else loaded_off=null; fi

MIN_DELTA="${EVAL_AB_MIN_DELTA_PCT:-50}"
on_done=$((REPEATS - on_err))
off_done=$((REPEATS - off_err))
gap=0
if [ $((on_done * 2)) -ge "$REPEATS" ] && [ $((off_done * 2)) -ge "$REPEATS" ] && [ "$on_done" -gt 0 ] && [ "$off_done" -gt 0 ]; then
  gap=$(( (on_pass * 100 / on_done) - (off_pass * 100 / off_done) ))
fi

if [ $((on_done * 2)) -lt "$REPEATS" ] || [ $((off_done * 2)) -lt "$REPEATS" ] || [ "$on_done" -eq 0 ] || [ "$off_done" -eq 0 ]; then
  verdict=error; code=5
elif [ "$gap" -ge "$MIN_DELTA" ]; then
  verdict=improved; code=0
elif [ "$gap" -le "-$MIN_DELTA" ]; then
  verdict=worse; code=20
elif [ "$on_pass" -eq "$on_done" ] && [ "$off_pass" -eq "$off_done" ]; then
  verdict=held; code=11
else
  verdict=no_difference; code=10
fi

agent="${EVAL_AGENT:-$(basename "${SKILLS_AGENT_CMD%% *}" .sh)}"
agent="${agent%-task}"
sha="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf '{"task":"%s","repeats":%d,"on":%d,"off":%d,"on_done":%d,"off_done":%d,"errors":%d,"delta":%d,"verdict":"%s","loaded_on":%s,"loaded_off":%s,"tokens_on":%s,"tokens_off":%s,"agent":"%s","model":"%s","sha":"%s","ts":"%s"}\n' \
  "$TASK" "$REPEATS" "$on_pass" "$off_pass" "$on_done" "$off_done" "$errors" "$((on_pass - off_pass))" "$verdict" "$loaded_on" "$loaded_off" "$tokens_on" "$tokens_off" \
  "$agent" "${TASK_MODEL:-default}" "$sha" "$ts" >>"$RESULTS"

echo "Task: $TASK  (repeats=$REPEATS)"
echo "  skill ON : $on_pass/$on_done completed runs passed ($on_err agent error(s))"
echo "  skill OFF: $off_pass/$off_done completed runs passed ($off_err agent error(s))"
echo "  skill loaded: on $loaded_on/$REPEATS, off $loaded_off/$REPEATS"
echo "  tokens per run (input/output): on $(tokens_text "$tokens_on"), off $(tokens_text "$tokens_off")"
case "$verdict" in
  improved)      echo "  => skill IMPROVES the result (earns its budget)." ;;
  held)          echo "  => both pass every run. The model may not need this rule." ;;
  no_difference) echo "  => no measurable difference. Re-examine whether this rule is needed/tested." ;;
  worse)         echo "  => skill made it WORSE. Investigate immediately." ;;
  error)         echo "  => too many agent errors ($errors); no verdict. Rerun once the provider is available." ;;
esac
exit "$code"
