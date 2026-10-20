#!/usr/bin/env bash
#
# Compare two A/B result files (baseline vs new) by task verdict.
#
#   scripts/eval-diff.sh <old.jsonl> <new.jsonl>
#
# Prints a Markdown table of tasks whose verdict or skill-on pass count
# changed, plus tasks that were added or removed. When both files have token
# counts for a task (`tokens_on`), a second table compares the average
# skill-on tokens per run: the check that a skill change does not make runs
# more expensive. Exit 0 always; this is a report, not a gate (eval-gate.sh
# is the gate).
set -euo pipefail

[[ $# -eq 2 ]] || { echo "usage: eval-diff.sh <old.jsonl> <new.jsonl>" >&2; exit 2; }
command -v jq >/dev/null || { echo "eval-diff: jq is required" >&2; exit 2; }

latest() { jq -s -c 'map(select(type == "object" and has("task"))) | group_by(.task) | map(last) | map({key: .task, value: .}) | from_entries' "$1"; }

old="$(latest "$1")"
new="$(latest "$2")"

rows="$(jq -n -r --argjson old "$old" --argjson new "$new" '
  ([$old, $new] | map(keys) | add | unique)[] as $t
  | ($old[$t]) as $o | ($new[$t]) as $n
  | if $o == null then "| `\($t)` | (new) | \($n.verdict) \($n.on)/\($n.repeats) |"
    elif $n == null then "| `\($t)` | \($o.verdict) \($o.on)/\($o.repeats) | (removed) |"
    elif ($o.verdict != $n.verdict) or ($o.on * $n.repeats != $n.on * $o.repeats)
      then "| `\($t)` | \($o.verdict) \($o.on)/\($o.repeats) | \($n.verdict) \($n.on)/\($n.repeats) |"
    else empty end
')"

tokens="$(jq -n -r --argjson old "$old" --argjson new "$new" '
  def total: .input + .output;
  def show: "\(.input) / \(.output)";
  ([$old, $new] | map(keys) | add | unique)[] as $t
  | ($old[$t].tokens_on) as $o | ($new[$t].tokens_on) as $n
  | if ($o | type) == "object" and ($n | type) == "object" and ($o | total) > 0
      then "| `\($t)` | \($o | show) | \($n | show) | \(((($n | total) - ($o | total)) * 1000 / ($o | total) | round) / 10) % |"
    else empty end
')"

echo "### Changes since baseline"
echo
if [[ -z "$rows" ]]; then
  echo "No task changed its verdict or skill-on pass rate."
else
  echo "| Task | Before | After |"
  echo "| ---- | ------ | ----- |"
  printf '%s\n' "$rows"
fi

if [[ -n "$tokens" ]]; then
  echo
  echo "### Tokens per skill-on run"
  echo
  echo "Average input / output tokens. Input includes cache reads and writes."
  echo
  echo "| Task | Before | After | Change (total) |"
  echo "| ---- | ------ | ----- | -------------- |"
  printf '%s\n' "$tokens"
fi
