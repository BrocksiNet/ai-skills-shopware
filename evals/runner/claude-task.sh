#!/usr/bin/env bash
#
# SKILLS_AGENT_CMD adapter for Layer 2/3 behavioral tasks with the Claude Code CLI.
#
# Reads the task prompt on stdin, lets Claude edit files in the current working
# directory (the eval workdir), and prints the assistant's text as the
# transcript. Only project settings are loaded (--setting-sources project), so
# the skills present are exactly what skills-profile.sh put into the workdir.
#
#   export SKILLS_AGENT_CMD="$PWD/evals/runner/claude-task.sh"
#   export SKILLS_PROFILE_CMD="$PWD/evals/runner/skills-profile.sh"
#   ./evals/runner/ab.sh dal-search-without-limit 3
#
# Exit codes: 0 when the session finished, 4 on a CLI/API error or a session
# that ended without a result. run-task.sh records 4 as an agent error, never
# as a failed task.
#
# Env:
#   TASK_MODEL           model alias (default: sonnet)
#   TASK_MAX_TURNS       turns per task (default: 12)
#   TASK_MAX_BUDGET_USD  spend cap per session (default: 0.75)
#   EVAL_SKILLS_LOG      when set, this file is created and gets one line per
#                        skill the agent loaded (set by ab.sh)
#
# Permissions are bypassed because the workdir is a throwaway temp copy of a
# fixture. Do not point this adapter at a real checkout.
set -euo pipefail

MODEL="${TASK_MODEL:-sonnet}"
MAX_TURNS="${TASK_MAX_TURNS:-12}"
MAX_BUDGET="${TASK_MAX_BUDGET_USD:-0.75}"

command -v claude >/dev/null || { echo "claude CLI not found" >&2; exit 4; }

prompt="$(cat)"

set +e
printf '%s' "${prompt}" | claude -p \
  --setting-sources project \
  --model "${MODEL}" \
  --max-turns "${MAX_TURNS}" \
  --max-budget-usd "${MAX_BUDGET}" \
  --dangerously-skip-permissions \
  --no-session-persistence \
  --output-format stream-json --verbose |
  python3 -I -c '
import json, sys
texts, skills = [], []
result = None
for line in sys.stdin:
    try:
        msg = json.loads(line)
    except ValueError:
        continue
    if msg.get("type") == "result":
        result = msg
    if msg.get("type") != "assistant":
        continue
    for block in msg.get("message", {}).get("content", []):
        if block.get("type") == "text" and block.get("text", "").strip():
            texts.append(block["text"])
        if block.get("type") == "tool_use" and block.get("name") == "Skill":
            args = block.get("input") or {}
            name = (args.get("skill") or args.get("command") or "").lstrip("/").split(":")[-1].strip()
            if name and name not in skills:
                skills.append(name)
print("\n\n".join(texts))
if len(sys.argv) > 1 and sys.argv[1]:
    with open(sys.argv[1], "a", encoding="utf-8") as log:
        log.writelines(s + "\n" for s in skills)
if result is None:
    sys.stderr.write("claude-task: session ended without a result\n")
    sys.exit(4)
# Hitting the turn or budget cap is a finished attempt, graded as usual.
if result.get("subtype") in ("error_max_turns", "error_max_budget_usd"):
    sys.stderr.write("claude-task: stopped at %s\n" % result.get("subtype"))
    sys.exit(0)
if result.get("is_error") or result.get("subtype") != "success":
    sys.stderr.write("claude-task: %s\n" % (result.get("result") or result.get("subtype") or "unknown error"))
    sys.exit(4)
' "${EVAL_SKILLS_LOG:-}"
status=("${PIPESTATUS[@]}")
set -e

# status: [0] printf, [1] claude, [2] the result parser.
# The parser decides: it exits 4 on a missing or failed result. claude exits 1
# when it stops at a turn or budget cap, which the parser already accepted;
# any other non-zero claude exit (crash, signal) is an agent error.
if [[ "${status[2]}" -ne 0 ]]; then
  exit 4
fi
if [[ "${status[1]}" -ne 0 && "${status[1]}" -ne 1 ]]; then
  exit 4
fi
exit 0
