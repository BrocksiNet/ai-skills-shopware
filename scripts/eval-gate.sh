#!/usr/bin/env bash
#
# Gate and summarize A/B results written by evals/runner/ab.sh.
#
#   scripts/eval-gate.sh <ab.jsonl> [more.jsonl ...]
#
# Prints a Markdown summary to stdout (append it to $GITHUB_STEP_SUMMARY in CI)
# and exits 1 when a gate fails. When a task appears more than once, the last
# line wins, so a rerun replaces the earlier result.
#
# Gates:
#   - no task is "worse" (skill on passed fewer runs than skill off)
#   - of the tasks with a verdict, at least EVAL_GATE_MIN_PASS_PCT % pass every
#     run with the skill on (default 70)
#   - at most EVAL_GATE_MAX_ERROR_PCT % of tasks ended in agent errors
#     (default 25); more means the provider failed, not the skills
#   - at least EVAL_GATE_MIN_LOAD_PCT % of skill-on runs loaded one of the
#     task's skills (default 50). Below that the model ignores the skills and
#     "on" equals "off", so the A/B measures nothing. Pick a model that uses
#     skills.
#   - no skill-off run loaded a repo skill (skills leaked into the baseline)
#   The two skill-load gates only count lines whose adapter reports loads
#   (`loaded_on` / `loaded_off` not null).
#
# "held" and "no_difference" tasks are listed as warnings: candidates for a
# sharper eval or for removing the rule.
set -euo pipefail

[[ $# -ge 1 ]] || { echo "usage: eval-gate.sh <ab.jsonl> [...]" >&2; exit 2; }
command -v jq >/dev/null || { echo "eval-gate: jq is required" >&2; exit 2; }

MIN_PASS_PCT="${EVAL_GATE_MIN_PASS_PCT:-70}"
MAX_ERROR_PCT="${EVAL_GATE_MAX_ERROR_PCT:-25}"
MIN_LOAD_PCT="${EVAL_GATE_MIN_LOAD_PCT:-50}"

results="$(cat "$@" | jq -s -c 'map(select(type == "object" and has("task"))) | group_by(.task) | map(last)')"

total="$(jq 'length' <<<"$results")"
if [[ "$total" -eq 0 ]]; then
  echo "## A/B eval results"
  echo
  echo "No results found. Did any task run?"
  exit 1
fi

count() { jq --arg v "$1" '[.[] | select(.verdict == $v)] | length' <<<"$results"; }
improved="$(count improved)"
held="$(count held)"
nodiff="$(count no_difference)"
worse="$(count worse)"
errors="$(count error)"
graded=$((total - errors))
# Older lines have no on_done; then every run counted.
full_on="$(jq '[.[] | select(.verdict != "error" and .on == (.on_done // .repeats))] | length' <<<"$results")"

pass_pct=0
if [[ "$graded" -gt 0 ]]; then
  pass_pct=$((full_on * 100 / graded))
fi
error_pct=$((errors * 100 / total))

# Skill loads over graded tasks whose adapter reported them.
load_runs="$(jq '[.[] | select(.verdict != "error" and (.loaded_on | type) == "number") | (.on_done // .repeats)] | add // 0' <<<"$results")"
loaded_runs="$(jq '[.[] | select(.verdict != "error" and (.loaded_on | type) == "number") | .loaded_on] | add // 0' <<<"$results")"
leaked="$(jq '[.[] | select((.loaded_off | type) == "number" and .loaded_off > 0)] | length' <<<"$results")"
load_pct=-1
if [[ "$load_runs" -gt 0 ]]; then
  load_pct=$((loaded_runs * 100 / load_runs))
fi

meta="$(jq -r 'first | "\(.agent) / \(.model) @ \(.sha), \(.repeats) repeat(s)"' <<<"$results")"

echo "## A/B eval results"
echo
echo "$meta"
echo
echo "| Verdict | Tasks |"
echo "| ------- | ----- |"
echo "| improved | $improved |"
echo "| held | $held |"
echo "| no_difference | $nodiff |"
echo "| worse | $worse |"
echo "| error | $errors |"
echo
echo "Skill-on full pass: **$full_on / $graded** ($pass_pct %, gate $MIN_PASS_PCT %)."
if [[ "$load_pct" -ge 0 ]]; then
  echo
  echo "Skill-on runs that loaded a task skill: **$loaded_runs / $load_runs** ($load_pct %, gate $MIN_LOAD_PCT %)."
fi
echo
echo "<details><summary>Per task</summary>"
echo
echo "On and Off count passed / completed runs."
echo
echo "| Task | On | Off | Skill loaded (on) | Verdict |"
echo "| ---- | -- | --- | ----------------- | ------- |"
jq -r '
  def rank: {"worse":0,"error":1,"no_difference":2,"held":3,"improved":4}[.verdict] // 5;
  def loaded: if (.loaded_on | type) == "number" then "\(.loaded_on)/\(.repeats)" else "n/a" end;
  sort_by(rank, .task)[] | "| `\(.task)` | \(.on)/\(.on_done // .repeats) | \(.off)/\(.off_done // .repeats) | \(loaded) | \(.verdict) |"
' <<<"$results"
echo
echo "</details>"
echo

failed=0
if [[ "$worse" -gt 0 ]]; then
  echo "- **FAIL**: $worse task(s) got worse with the skill on:"
  jq -r '.[] | select(.verdict == "worse") | "  - `\(.task)`"' <<<"$results"
  failed=1
fi
if [[ "$graded" -gt 0 && "$pass_pct" -lt "$MIN_PASS_PCT" ]]; then
  echo "- **FAIL**: skill-on full pass rate $pass_pct % is below $MIN_PASS_PCT %."
  failed=1
fi
if [[ "$error_pct" -gt "$MAX_ERROR_PCT" ]]; then
  echo "- **FAIL**: $error_pct % of tasks ended in agent errors (limit $MAX_ERROR_PCT %). Check the provider, then rerun."
  failed=1
fi
if [[ "$load_pct" -ge 0 && "$load_pct" -lt "$MIN_LOAD_PCT" ]]; then
  echo "- **FAIL**: only $load_pct % of skill-on runs loaded a task skill (gate $MIN_LOAD_PCT %). The model ignores the skills, so on and off are the same run. Use a model that loads skills."
  failed=1
fi
if [[ "$leaked" -gt 0 ]]; then
  echo "- **FAIL**: $leaked task(s) loaded a repo skill with skills off; the baseline is not skill-free:"
  jq -r '.[] | select((.loaded_off | type) == "number" and .loaded_off > 0) | "  - `\(.task)`"' <<<"$results"
  failed=1
fi
if [[ $((held + nodiff)) -gt 0 ]]; then
  echo "- Warning: $((held + nodiff)) task(s) show no difference between skill on and off:"
  jq -r '.[] | select(.verdict == "held" or .verdict == "no_difference")
    | "  - `\(.task)` (\(.verdict)\(if .loaded_on == 0 then ", skill never loaded" else "" end))"' <<<"$results"
fi
if [[ "$failed" -eq 0 ]]; then
  echo "- Gate: **PASS**"
fi
exit "$failed"
