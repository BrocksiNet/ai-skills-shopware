#!/usr/bin/env bash
#
# SKILLS_ACTIVATION_CMD adapter for Layer 1 activation evals with the Claude Code CLI.
#
# Reads a prompt on stdin, runs it in a fresh, empty workspace whose only
# project skills are this repo's skills/ (symlinked as .claude/skills), and
# prints the name of every skill the model invoked, one per line.
#
#   export SKILLS_ACTIVATION_CMD="$PWD/evals/runner/claude-activation.sh"
#   ./scripts/run-activation-evals.sh
#
# Isolation: --setting-sources project skips your user settings, user skills
# and plugins, so only the repo skills (plus Claude Code's built-in ones)
# compete for activation. Tools are limited to Skill and read-only file tools,
# so a run cannot change anything, and --max-turns keeps each run short.
# CLI/API errors fail the run; they must never look like no activation.
#
# Env:
#   ACTIVATION_SKILLS_DIR  skills folder to expose (default: <repo>/skills)
#   ACTIVATION_MODEL       model alias (default: sonnet)
#   ACTIVATION_MAX_TURNS   turns per prompt (default: 3)
#
# The adapter is TypeScript in tools/ (plan WP10); this wrapper keeps the
# path that evals.yml, the scripts and the docs use. Needs Node 24.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
exec node "$ROOT/tools/bin/adapter.ts" claude-activation "$@"
