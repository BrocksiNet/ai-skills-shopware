#!/usr/bin/env bash
#
# Run the model evals on this machine with an agent you are already logged in
# to, then apply the same gate as CI. No API key or repository secret needed.
#
#   scripts/eval-local.sh                       # Claude Code (claude auth login)
#   EVAL_LOCAL_AGENT=copilot scripts/eval-local.sh   # your Copilot seat (gh login)
#   EVAL_LOCAL_AGENT=opencode scripts/eval-local.sh  # OpenCode, free model
#   EVAL_TASKS=prepare-plugin-for-6-8 REPEATS=3 scripts/eval-local.sh
#
# Env:
#   EVAL_LOCAL_AGENT  claude (default), copilot or opencode
#   TASK_MODEL        claude: model alias (default haiku);
#                     copilot: Copilot model id (default claude-haiku-4.5);
#                     opencode: provider/model (default: adapter default)
#   COPILOT_GITHUB_TOKEN  copilot: the token; default: `gh auth token`
#   EVAL_TASKS        comma-separated tasks (default: all, see eval-plan.sh)
#   EVAL_MAX_TASKS    cap on the task count (default 0 = no cap)
#   EVAL_CHANGED_FILES  select tasks for changed files, as in eval-plan.sh
#   REPEATS           runs per task and mode (default 3)
#   EVAL_RESULTS      JSONL output (default evals/.results/local-<ts>.jsonl)
#
# opencode and copilot runs keep a throwaway HOME, so no global skills leak
# into the "off" run. opencode copies your OpenCode login (auth.json) for
# API-key providers; its GitHub Copilot login does not carry over, so use
# EVAL_LOCAL_AGENT=copilot for Copilot models. Copilot runs cost premium
# requests: a third of one per session with claude-haiku-4.5.
#
# Exit code: the gate's (0 pass, 1 fail), or 2 when nothing could run.
#
# Wrapper: the logic is TypeScript in tools/src/eval-local.ts (plan WP10 step
# 4). Needs Node 24 or newer.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$ROOT/tools/bin/eval-local.ts" "$@"
