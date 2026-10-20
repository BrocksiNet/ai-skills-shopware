#!/usr/bin/env bash
#
# Run the model evals on this machine with an agent you are already logged in
# to, then apply the same gate as CI. No API key or repository secret needed.
#
#   scripts/eval-local.sh                       # Claude Code (claude auth login)
#   EVAL_LOCAL_AGENT=opencode TASK_MODEL=github-copilot/claude-haiku-4.5 \
#     scripts/eval-local.sh                     # OpenCode with your logins
#   EVAL_TASKS=prepare-plugin-for-6-8 REPEATS=3 scripts/eval-local.sh
#
# Env:
#   EVAL_LOCAL_AGENT  claude (default) or opencode
#   TASK_MODEL        claude: model alias (default haiku);
#                     opencode: provider/model (default: adapter default)
#   EVAL_TASKS        comma-separated tasks (default: all, see eval-plan.sh)
#   EVAL_MAX_TASKS    cap on the task count (default 0 = no cap)
#   REPEATS           runs per task and mode (default 3)
#   EVAL_RESULTS      JSONL output (default evals/.results/local-<ts>.jsonl)
#
# opencode runs keep the throwaway HOME (no global skills leak into the "off"
# run) but copy your OpenCode login (auth.json), so providers you are logged
# in to, such as GitHub Copilot, work. See OPENCODE_AUTH_FILE in
# evals/runner/opencode-task.sh.
#
# Exit code: the gate's (0 pass, 1 fail).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENT="${EVAL_LOCAL_AGENT:-claude}"
REPEATS="${REPEATS:-3}"

case "$AGENT" in
  claude)
    command -v claude >/dev/null || { echo "claude CLI not found" >&2; exit 2; }
    export TASK_MODEL="${TASK_MODEL:-haiku}"
    ;;
  opencode)
    command -v opencode >/dev/null || { echo "opencode CLI not found" >&2; exit 2; }
    export OPENCODE_AUTH_FILE="${OPENCODE_AUTH_FILE:-${XDG_DATA_HOME:-$HOME/.local/share}/opencode/auth.json}"
    ;;
  *) echo "EVAL_LOCAL_AGENT must be claude or opencode" >&2; exit 2 ;;
esac

export SKILLS_AGENT_CMD="$ROOT/evals/runner/${AGENT}-task.sh"
export SKILLS_PROFILE_CMD="$ROOT/evals/runner/skills-profile.sh"
export EVAL_AGENT="$AGENT"
export EVAL_RESULTS="${EVAL_RESULTS:-$ROOT/evals/.results/local-$(date -u +%Y%m%dT%H%M%SZ).jsonl}"
mkdir -p "$(dirname "$EVAL_RESULTS")"

plan="$(EVAL_SHARDS=1 "$ROOT/scripts/eval-plan.sh")"
mapfile -t tasks < <(jq -r '.tasks[]' <<<"$plan")
[[ "${#tasks[@]}" -gt 0 ]] || { echo "No tasks selected." >&2; exit 2; }

echo "Agent $AGENT, model ${TASK_MODEL:-default}, ${#tasks[@]} task(s), $REPEATS repeat(s)" >&2
echo "Results: $EVAL_RESULTS" >&2
for task in "${tasks[@]}"; do
  echo "== $task" >&2
  # ab.sh exit codes encode the verdict; the gate decides.
  "$ROOT/evals/runner/ab.sh" "$task" "$REPEATS" >&2 || true
done

"$ROOT/scripts/eval-gate.sh" "$EVAL_RESULTS"
