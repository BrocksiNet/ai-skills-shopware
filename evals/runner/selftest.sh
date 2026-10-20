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
export SKILLS_PROFILE_CMD="$HERE/skills-profile.sh"
export EVAL_RESULTS="$tmp/ab.jsonl"
export EVAL_AGENT=fake TASK_MODEL=none
# No retries unless a check asks for them; retries are tested on their own.
export EVAL_AGENT_RETRIES=0 EVAL_AGENT_RETRY_WAIT=0

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

rc=0; EVAL_AGENT_RETRIES=1 FAKE_AGENT_MODE=always-pass FAKE_AGENT_ERROR_ONCE="$tmp/retry-once" \
  "$HERE/run-task.sh" "$TASK_A" on >/dev/null 2>"$tmp/retry.err" || rc=$?
check "agent error is retried on a fresh workdir" 0 "$rc"
check "retry reason is logged" 1 "$(grep -c 'retrying' "$tmp/retry.err" || true)"
rc=0; EVAL_AGENT_RETRIES=1 FAKE_AGENT_MODE=error "$HERE/run-task.sh" "$TASK_A" on >/dev/null 2>"$tmp/retry.err" || rc=$?
check "persistent agent error still exits 4" 4 "$rc"
check "final error names the reason" 1 "$(grep -c 'simulated API error; not graded' "$tmp/retry.err" || true)"

echo "skills-profile.sh"
wd="$tmp/profile"; mkdir -p "$wd"
"$HERE/skills-profile.sh" on "$wd" "$TASK_A"
check "task skills file selects its skills" 2 "$(find "$wd/.claude/skills" -mindepth 1 -maxdepth 1 | wc -l | tr -d ' ')"
"$HERE/skills-profile.sh" off "$wd" "$TASK_A"
check "off removes the folder" absent "$([[ -e "$wd/.claude/skills" ]] && echo present || echo absent)"
"$HERE/skills-profile.sh" on "$wd" "$TASK_B"
all="$(find "$ROOT/skills" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
check "no skills file loads all skills" "$all" "$(find "$wd/.claude/skills" -mindepth 1 -maxdepth 1 | wc -l | tr -d ' ')"

echo "ab.sh verdicts"
check "skill-helps exit" 0 "$(ab skill-helps "$TASK_A")"
check "skill-helps verdict" improved "$(last_field verdict)"
check "skill-helps on/off" "2/0" "$(last_field on)/$(last_field off)"
check "skill loads counted per mode" "2/0" "$(last_field loaded_on)/$(last_field loaded_off)"
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

# Separate results file so the line counts above stay exact.
rc=0; EVAL_RESULTS="$tmp/partial.jsonl" FAKE_AGENT_MODE=skill-helps FAKE_AGENT_ERROR_ONCE="$tmp/err-once" \
  "$HERE/ab.sh" "$TASK_A" 3 >/dev/null 2>&1 || rc=$?
check "one agent error still gives a verdict" "0 improved" "$rc $(jq -r .verdict "$tmp/partial.jsonl")"
check "completed runs are counted" "2/3" "$(jq -r '"\(.on_done)/\(.off_done)"' "$tmp/partial.jsonl")"
rc=0; EVAL_RESULTS="$tmp/noise.jsonl" FAKE_AGENT_MODE=always-pass FAKE_AGENT_FAIL_ONCE="$tmp/fail-once" \
  "$HERE/ab.sh" "$TASK_B" 3 >/dev/null 2>&1 || rc=$?
check "one-run gap is noise, not worse" "10 no_difference" "$rc $(jq -r .verdict "$tmp/noise.jsonl")"
rc=0; ( unset EVAL_AGENT; FAKE_AGENT_MODE=always-pass "$HERE/ab.sh" "$TASK_B" 1 >/dev/null 2>&1 ) || rc=$?
check "agent label defaults to the adapter name" fake-agent "$(last_field agent)"
sed -i.bak '$d' "$EVAL_RESULTS" && rm -f "$EVAL_RESULTS.bak"

echo "opencode-task.sh (fake opencode binary)"
fakebin="$tmp/bin"; mkdir -p "$fakebin"
cat >"$fakebin/opencode" <<'FAKE'
#!/usr/bin/env bash
case "${FAKE_OPENCODE:-ok}" in
  ok)    echo '{"type":"tool_use","part":{"tool":"skill","state":{"input":{"id":"shopware-testing"}}}}'
         echo '{"type":"tool_use","part":{"tool":"edit"}}'
         echo '{"type":"text","part":{"text":"DONE"}}' ;;
  error) echo '{"type":"error","error":{"message":"Model unavailable"}}'; exit 1 ;;
  empty) echo '{"type":"step_start"}' ;;
  hang)  sleep 30 ;;
esac
FAKE
chmod +x "$fakebin/opencode"
oc() { # $1 = fake mode ; $2 = timeout (default 2) ; prints "<exit> <stdout>"
  local out rc=0
  out="$(printf 'x' | PATH="$fakebin:$PATH" FAKE_OPENCODE="$1" TASK_TIMEOUT_SECONDS="${2:-2}" \
    "$HERE/opencode-task.sh" 2>/dev/null)" || rc=$?
  echo "$rc ${out//$'\n'/ }"
}
start=$SECONDS
check "finished session exits 0 and prints text" "0 DONE" "$(oc ok 20)"
check "finished session does not wait for the watchdog" yes "$([[ $((SECONDS - start)) -lt 10 ]] && echo yes || echo no)"
check "skill loads are logged" shopware-testing "$(EVAL_SKILLS_LOG="$tmp/oc-skills" oc ok >/dev/null; cat "$tmp/oc-skills")"
check "error event is an agent error" "4 " "$(oc error)"
check "no text and no tool call is an agent error" "4 " "$(oc empty)"
start=$SECONDS
check "timeout is an agent error" "4 " "$(oc hang)"
check "timeout returns promptly through a pipe" yes "$([[ $((SECONDS - start)) -lt 10 ]] && echo yes || echo no)"

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
# Skill-load gates, each on its own results file.
loadcase() { # $1 = FAKE_AGENT_LOAD ; prints the gate exit code, summary in $tmp/load.md
  local file="$tmp/load-$1.jsonl" rc=0
  EVAL_RESULTS="$file" FAKE_AGENT_MODE=always-pass FAKE_AGENT_LOAD="$1" "$HERE/ab.sh" "$TASK_B" 1 >/dev/null 2>&1 || true
  "$ROOT/scripts/eval-gate.sh" "$file" >"$tmp/load.md" || rc=$?
  echo "$rc"
}
check "skills loaded passes the gate" 0 "$(loadcase present)"
check "model that ignores skills fails the gate" 1 "$(loadcase none)"
check "ignored skills is the reason" 1 "$(grep -c 'ignores the skills' "$tmp/load.md" || true)"
check "skill leak into the off run fails the gate" 1 "$(loadcase leak)"
check "leak is the reason" 1 "$(grep -c 'not skill-free' "$tmp/load.md" || true)"
check "adapter without load reporting is not gated" 0 "$(loadcase unsupported)"
check "unreported loads are null" null "$(jq -r '.loaded_on' "$tmp/load-unsupported.jsonl")"
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
