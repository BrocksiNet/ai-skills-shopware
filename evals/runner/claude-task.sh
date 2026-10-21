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
#   EVAL_USAGE_LOG       when set, gets one line "<input> <output>" with the
#                        session's tokens; input includes cache reads and
#                        writes (set by ab.sh)
#
# Permissions are bypassed because the workdir is a throwaway temp copy of a
# fixture. Do not point this adapter at a real checkout.
#
# The adapter is TypeScript in tools/ (plan WP10); this wrapper keeps the
# path that evals.yml, the scripts and the docs use. Needs Node 24.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
exec node "$ROOT/tools/bin/adapter.ts" claude-task "$@"
