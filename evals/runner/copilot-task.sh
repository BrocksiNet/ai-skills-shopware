#!/usr/bin/env bash
#
# SKILLS_AGENT_CMD adapter for Layer 2/3 behavioral tasks with the GitHub
# Copilot CLI (`copilot -p`).
#
# The second eval model next to the free OpenCode one: Copilot models load
# skills reliably, and claude-haiku-4.5 costs a third of a premium request per
# session (one task A/B with 3 repeats: 6 sessions, about 2 premium requests).
#
# Reads the task prompt on stdin, lets Copilot edit files in the current
# working directory (the eval workdir), and prints the assistant's text as the
# transcript. HOME, the XDG folders and COPILOT_HOME point at a throwaway
# directory, so no user login, config or personal skills leak in. The skills
# present are exactly what skills-profile.sh linked into the workdir
# (`.agents/skills` and `.claude/skills`, both read by Copilot). Each linked
# skill's real folder gets an --add-dir grant, because Copilot refuses to read
# files behind a link outside the workdir (a skill's references) without one.
# A skill-off run has no links and gets no grant.
#
#   export COPILOT_GITHUB_TOKEN="$(gh auth token)"   # locally; CI uses a secret
#   export SKILLS_AGENT_CMD="$PWD/evals/runner/copilot-task.sh"
#   export SKILLS_PROFILE_CMD="$PWD/evals/runner/skills-profile.sh"
#   ./evals/runner/ab.sh dal-search-without-limit 3
#
# Exit codes: 0 when the session finished, 4 on a CLI/API error, a missing
# token, a timeout, or a session that produced neither text nor a tool call.
# run-task.sh records 4 as an agent error, never as a failed task.
#
# Env:
#   COPILOT_GITHUB_TOKEN  required (or GH_TOKEN): a fine-grained personal access
#                         token with the "Copilot Requests" permission, or the
#                         OAuth token of `gh auth token`. Kept out of the
#                         agent's shell with --secret-env-vars.
#   TASK_MODEL            Copilot model id (default: claude-haiku-4.5)
#   TASK_TIMEOUT_SECONDS  wall clock per session (default: 600). The Copilot
#                         CLI has no turn cap, so TASK_MAX_TURNS is ignored.
#   COPILOT_TASK_READ_ONLY  1 = only the skill tool and read-only tools (view,
#                         glob, grep). Enough for review-* tasks, and safe to
#                         run on your own machine. Default 0: every tool.
#   EVAL_SKILLS_LOG       when set, gets one line per skill the agent loaded
#   EVAL_USAGE_LOG        when set, gets one line "<input> <output>" with the
#                         session's tokens; input includes cache reads and
#                         writes, output includes reasoning
#
# Web fetch is off, like web search for OpenCode, and the built-in GitHub MCP
# server is not loaded. Every other tool is auto-approved because the workdir
# is a throwaway temp copy of a fixture. Do not point this adapter at a real
# checkout.
#
# The adapter is TypeScript in tools/src/agents-copilot.ts; this wrapper keeps the path
# that evals.yml, the scripts and the docs use. Needs Node 24.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
exec node "$ROOT/tools/bin/adapter.ts" copilot-task "$@"
