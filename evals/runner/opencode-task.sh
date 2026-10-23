#!/usr/bin/env bash
#
# SKILLS_AGENT_CMD adapter for Layer 2/3 behavioral tasks with the OpenCode CLI.
#
# The default model is one of OpenCode's free models, which need no account and
# no API key. That makes it the default for CI in this public repo.
#
# Reads the task prompt on stdin, lets OpenCode edit files in the current
# working directory (the eval workdir), and prints the assistant's text as the
# transcript. HOME and the XDG folders point at a throwaway directory, so no
# user config, login or global skills leak in. The skills present are exactly
# what skills-profile.sh linked into the workdir (`.claude/skills` and
# `.agents/skills`, both read by OpenCode).
#
#   export SKILLS_AGENT_CMD="$PWD/evals/runner/opencode-task.sh"
#   export SKILLS_PROFILE_CMD="$PWD/evals/runner/skills-profile.sh"
#   ./evals/runner/ab.sh dal-search-without-limit 3
#
# Exit codes: 0 when the session finished, 4 on a CLI/API error, a timeout, or a
# session that produced neither text nor a tool call. run-task.sh records 4 as
# an agent error, never as a failed task.
#
# Env:
#   TASK_MODEL            provider/model (default: opencode/mimo-v2.6-flash-free)
#   TASK_MAX_TURNS        agent steps per task (default: 12)
#   TASK_TIMEOUT_SECONDS  wall clock per session (default: 600)
#   OPENCODE_ISOLATE      1 = throwaway HOME/XDG (default); 0 = your own config
#                         (0 lets your global skills leak into the "off" run)
#   OPENCODE_AUTH_FILE    an OpenCode auth.json to copy into the throwaway HOME,
#                         so providers you are logged in to (GitHub Copilot,
#                         OpenAI, ...) work while skills stay isolated
#   EVAL_SKILLS_LOG       when set, this file is created and gets one line per
#                         skill the agent loaded (set by ab.sh)
#   EVAL_USAGE_LOG        when set, gets one line "<input> <output>" with the
#                         tokens summed over all steps; input includes cache
#                         reads and writes, output includes reasoning
#   Provider keys such as OPENROUTER_API_KEY pass through when you pick a
#   non-free TASK_MODEL.
#
# Free models are offered "for a limited time" and change often. List the
# current ones with: opencode models --standalone | grep -E 'free|pickle'
# Some free providers log prompts to improve their models. Eval fixtures are
# public code, so that is acceptable here; do not point this at private code.
#
# Web search is off: in --standalone mode it is always cancelled, and a session
# with a cancelled search exits 1 although it finished.
#
# Permissions are auto-approved because the workdir is a throwaway temp copy of
# a fixture. Do not point this adapter at a real checkout.
#
# The adapter is TypeScript in tools/ (plan WP10); this wrapper keeps the
# path that evals.yml, the scripts and the docs use. Needs Node 24.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
exec node "$ROOT/tools/bin/adapter.ts" opencode-task "$@"
