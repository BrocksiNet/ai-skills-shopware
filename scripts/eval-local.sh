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
#   EVAL_CHANGED_FILES  select tasks for changed files, as in eval-plan.sh
#   REPEATS           runs per task and mode (default 3)
#   EVAL_RESULTS      JSONL output (default evals/.results/local-<ts>.jsonl)
#
# opencode runs keep the throwaway HOME (no global skills leak into the "off"
# run) but copy your OpenCode login (auth.json), so providers you are logged
# in to, such as GitHub Copilot, work. See OPENCODE_AUTH_FILE in
# evals/runner/opencode-task.sh.
#
# Exit code: the gate's (0 pass, 1 fail), or 2 when nothing could run.
#
# Wrapper: the logic is TypeScript in tools/src/eval-local.ts (plan WP10 step
# 4). Needs Node 24 or newer.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$ROOT/tools/bin/eval-local.ts" "$@"
