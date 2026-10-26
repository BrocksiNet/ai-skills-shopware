#!/usr/bin/env bash
#
# SKILLS_ACTIVATION_CMD adapter for Layer 1 activation evals with the GitHub
# Copilot CLI.
#
# Reads a prompt on stdin, runs it in a fresh, empty workspace whose only
# project skills are this repo's skills/ (symlinked as .agents/skills), and
# prints the name of every skill the model loaded, one per line.
#
#   export COPILOT_GITHUB_TOKEN="$(gh auth token)"
#   export SKILLS_ACTIVATION_CMD="$PWD/evals/runner/copilot-activation.sh"
#   ./scripts/run-activation-evals.sh
#
# Only the skill tool and read-only tools (view, glob, grep) are available, so
# a run cannot change anything. HOME and COPILOT_HOME point at a throwaway
# directory. CLI/API errors fail the run; they must never look like no
# activation.
#
# Env:
#   COPILOT_GITHUB_TOKEN   required (or GH_TOKEN), see copilot-task.sh
#   ACTIVATION_SKILLS_DIR  skills folder to expose (default: <repo>/skills)
#   ACTIVATION_MODEL       Copilot model id (default: claude-haiku-4.5)
#
# The adapter is TypeScript in tools/src/agents-copilot.ts; this wrapper keeps the path
# that evals.yml, the scripts and the docs use. Needs Node 24.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
exec node "$ROOT/tools/bin/adapter.ts" copilot-activation "$@"
