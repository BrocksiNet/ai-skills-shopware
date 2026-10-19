#!/usr/bin/env bash
#
# Self-test for the model-eval pipeline. No model calls, no secrets.
#
#   ./evals/runner/selftest.sh
#
# Drives run-task.sh and ab.sh with fake-agent.sh and checks that every verdict,
# exit code and JSON line is what really happened. Then checks eval-gate.sh,
# eval-plan.sh and eval-diff.sh on those results. Runs in validate.yml, so a
# runner change that would make CI green on a broken eval fails here first.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"

# Bash-only graders, so the self-test needs no Node install.
TASK_A=dal-search-without-limit   # has a `skills` file
TASK_B=no-empty-explicit          # no `skills` file: profile loads all skills

tmp="$(mktemp -d "${TMPDIR:-/tmp}/eval-selftest.XXXXXX")"
trap 'rm -rf "$tmp"' EXIT

export SKILLS_AGENT_CMD="$HERE/fake-agent.sh"
export SKILLS_PROFILE_CMD="$HERE/claude-profile.sh"
export EVAL_RESULTS="$tmp/ab.jsonl"
export EVAL_AGENT=fake TASK_MODEL=none

failures=0
check() { # $1 = label ; $2 = expected ; $3 = actual
  if [[ "$2" == "$3" ]]; then
    printf '  OK: %s\n' "$1"
  else
    printf '  FAIL: %s (expected %s, got %s)\n' "$1" "$2" "$3" >&2
    failures=$((failures + 1))
  fi
}

ab() { # $1 = fake mode ; $2 = task ; prints the exit code
  local rc=0
  FAKE_AGENT_MODE="$1" "$HERE/ab.sh" "$2" 2 >/dev/null 2>&1 || rc=$?
  echo "$rc"
}

last_field() { # $1 = jq field of the last JSON line
  tail -n1 "$EVAL_RESULTS" | jq -r ".$1"
}

echo "run-task.sh"
rc=0; FAKE_AGENT_MODE=always-pass "$HERE/run-task.sh" "$TASK_A" on >/dev/null 2>&1 || rc=$?
check "graded pass exits 0" 0 "$rc"
rc=0; FAKE_AGENT_MODE=always-fail "$HERE/run-task.sh" "$TASK_A" on >/dev/null 2>&1 || rc=$?
check "graded fail exits 1" 1 "$rc"
rc=0; FAKE_AGENT_MODE=error "$HERE/run-task.sh" "$TASK_A" on >/dev/null 2>&1 || rc=$?
check "agent error exits 4, not graded" 4 "$rc"
rc=0; SKILLS_AGENT_CMD='' "$HERE/run-task.sh" "$TASK_A" on >/dev/null 2>&1 || rc=$?
check "no agent exits 3" 3 "$rc"
rc=0; FAKE_AGENT_MODE=skill-helps "$HERE/run-task.sh" "$TASK_A" off >/dev/null 2>&1 || rc=$?
check "profile off really removes skills" 1 "$rc"

echo "claude-profile.sh"
wd="$tmp/profile"; mkdir -p "$wd"
"$HERE/claude-profile.sh" on "$wd" "$TASK_A"
check "task skills file selects its skills" 2 "$(find "$wd/.claude/skills" -mindepth 1 -maxdepth 1 | wc -l | tr -d ' ')"
"$HERE/claude-profile.sh" off "$wd" "$TASK_A"
check "off removes the folder" absent "$([[ -e "$wd/.claude/skills" ]] && echo present || echo absent)"
"$HERE/claude-profile.sh" on "$wd" "$TASK_B"
all="$(find "$ROOT/skills" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
check "no skills file loads all skills" "$all" "$(find "$wd/.claude/skills" -mindepth 1 -maxdepth 1 | wc -l | tr -d ' ')"

echo "ab.sh verdicts"
check "skill-helps exit" 0 "$(ab skill-helps "$TASK_A")"
check "skill-helps verdict" improved "$(last_field verdict)"
check "skill-helps on/off" "2/0" "$(last_field on)/$(last_field off)"
check "always-pass exit" 11 "$(ab always-pass "$TASK_B")"
check "always-pass verdict" held "$(last_field verdict)"
check "always-fail exit" 10 "$(ab always-fail "$TASK_B")"
check "always-fail verdict" no_difference "$(last_field verdict)"
check "skill-hurts exit" 20 "$(ab skill-hurts "$TASK_A")"
check "skill-hurts verdict" worse "$(last_field verdict)"
check "error exit" 5 "$(ab error "$TASK_A")"
check "error verdict" error "$(last_field verdict)"
check "error count" 4 "$(last_field errors)"
rc=0; SKILLS_PROFILE_CMD='' "$HERE/ab.sh" "$TASK_A" 1 >/dev/null 2>&1 || rc=$?
check "no profile command is refused" 2 "$rc"
check "one JSON line per A/B" 5 "$(wc -l <"$EVAL_RESULTS" | tr -d ' ')"

echo "eval-gate.sh"
good="$tmp/good.jsonl"
grep -E '"verdict":"(improved|held)"' "$EVAL_RESULTS" >"$good"
rc=0; "$ROOT/scripts/eval-gate.sh" "$good" >/dev/null || rc=$?
check "improved + held passes" 0 "$rc"
worse="$tmp/worse.jsonl"
{ grep '"verdict":"held"' "$EVAL_RESULTS"; grep '"verdict":"worse"' "$EVAL_RESULTS"; } >"$worse"
rc=0; EVAL_GATE_MIN_PASS_PCT=0 "$ROOT/scripts/eval-gate.sh" "$worse" >"$tmp/summary.md" || rc=$?
check "a worse task fails the gate" 1 "$rc"
check "summary names the worse task" 1 "$(grep -c "^  - \`$TASK_A\`$" "$tmp/summary.md" || true)"
check "worse is the only failure" 1 "$(grep -c 'FAIL' "$tmp/summary.md" || true)"
errs="$tmp/errors.jsonl"
{ grep '"verdict":"held"' "$EVAL_RESULTS"; grep '"verdict":"error"' "$EVAL_RESULTS"; } >"$errs"
rc=0; "$ROOT/scripts/eval-gate.sh" "$errs" >"$tmp/summary.md" || rc=$?
check "too many agent errors fail the gate" 1 "$rc"
check "error share is the reason" 1 "$(grep -c 'agent errors' "$tmp/summary.md" || true)"
low="$tmp/low.jsonl"
{ grep '"verdict":"held"' "$EVAL_RESULTS"; grep '"verdict":"no_difference"' "$EVAL_RESULTS" | sed 's/"task":"[^"]*"/"task":"other"/'; } >"$low"
rc=0; "$ROOT/scripts/eval-gate.sh" "$low" >"$tmp/summary.md" || rc=$?
check "pass rate below the gate fails" 1 "$rc"
check "pass rate is the reason" 1 "$(grep -c 'full pass rate' "$tmp/summary.md" || true)"
rc=0; "$ROOT/scripts/eval-gate.sh" /dev/null >/dev/null || rc=$?
check "no results fails the gate" 1 "$rc"
# Last line per task wins: TASK_A ends as "error", TASK_B as "no_difference".
check "last line per task wins" 2 "$("$ROOT/scripts/eval-gate.sh" "$EVAL_RESULTS" | grep -c '^| `' || true)"

echo "eval-plan.sh"
plan="$(EVAL_TASKS="$TASK_A,$TASK_B" EVAL_SHARDS=2 "$ROOT/scripts/eval-plan.sh")"
check "explicit tasks" 2 "$(jq '.count' <<<"$plan")"
check "two shards" 2 "$(jq '.shards | length' <<<"$plan")"
plan="$(EVAL_TASKS="$TASK_A,$TASK_B" EVAL_SHARDS=8 "$ROOT/scripts/eval-plan.sh")"
check "empty shards dropped" 2 "$(jq '.shards | length' <<<"$plan")"
plan="$(EVAL_MAX_TASKS=3 "$ROOT/scripts/eval-plan.sh")"
check "max tasks caps the list" 3 "$(jq '.count' <<<"$plan")"
printf 'skills/shopware-plugin-development/SKILL.md\nREADME.md\n' >"$tmp/changed.txt"
plan="$(EVAL_CHANGED_FILES="$tmp/changed.txt" "$ROOT/scripts/eval-plan.sh")"
check "changed skill selects its task" true "$(jq --arg t "$TASK_A" '.tasks | index($t) != null' <<<"$plan")"
check "changed skill selects tasks without a skills file" true "$(jq --arg t "$TASK_B" '.tasks | index($t) != null' <<<"$plan")"
check "unrelated task stays out" false "$(jq '.tasks | index("event-hook-capture-then-assert") != null' <<<"$plan")"
printf 'README.md\n' >"$tmp/changed.txt"
plan="$(EVAL_CHANGED_FILES="$tmp/changed.txt" "$ROOT/scripts/eval-plan.sh")"
check "docs-only change selects nothing" 0 "$(jq '.count' <<<"$plan")"
rc=0; EVAL_TASKS=does-not-exist "$ROOT/scripts/eval-plan.sh" >/dev/null 2>&1 || rc=$?
check "unknown task is rejected" 2 "$rc"

echo "eval-diff.sh"
diff_out="$("$ROOT/scripts/eval-diff.sh" "$good" "$EVAL_RESULTS")"
check "diff lists the changed task" 1 "$(grep -c "^| \`$TASK_A\` | improved 2/2 | error" <<<"$diff_out" || true)"
check "identical files report no change" 1 "$("$ROOT/scripts/eval-diff.sh" "$good" "$good" | grep -c 'No task changed' || true)"

echo
if [[ "$failures" -gt 0 ]]; then
  echo "eval selftest: $failures failure(s)" >&2
  exit 1
fi
echo "eval selftest: OK"
