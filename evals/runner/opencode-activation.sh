#!/usr/bin/env bash
#
# SKILLS_ACTIVATION_CMD adapter for Layer 1 activation evals with the OpenCode CLI.
#
# Reads a prompt on stdin, runs it in a fresh, empty workspace whose only
# project skills are this repo's skills/ (symlinked as .agents/skills), and
# prints the name of every skill the model loaded, one per line.
#
#   export SKILLS_ACTIVATION_CMD="$PWD/evals/runner/opencode-activation.sh"
#   ./scripts/run-activation-evals.sh
#
# The default model is a free OpenCode model (no account, no key). HOME and the
# XDG folders point at a throwaway directory, so no user config or global
# skills compete. Edits and shell are denied, so a run cannot change anything,
# and `steps` keeps each run short. CLI/API errors fail the run; they must
# never look like no activation.
#
# Env:
#   ACTIVATION_SKILLS_DIR  skills folder to expose (default: <repo>/skills)
#   ACTIVATION_MODEL       provider/model (default: opencode/mimo-v2.6-flash-free)
#   ACTIVATION_MAX_TURNS   agent steps per prompt (default: 3)
#
# The adapter is TypeScript in tools/ (plan WP10); this wrapper keeps the
# path that evals.yml, the scripts and the docs use. Needs Node 24.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
exec node "$ROOT/tools/bin/adapter.ts" opencode-activation "$@"
