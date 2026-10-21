#!/usr/bin/env bash
#
# Layer 1 - activation evals.
#
# For every skill, send each prompt in evals/should-trigger.md (expects the
# skill to activate) and evals/should-not-trigger.md (expects it NOT to) to an
# agent, then check whether the skill activated.
#
# Activation detection is provider-specific, so this script delegates to an
# agent command you configure. Contract:
#
#   SKILLS_ACTIVATION_CMD must read a prompt on stdin and print, to stdout, the
#   names of the skills it activated (one per line, or space/comma separated).
#   The skill name is the folder name (== SKILL.md `name`).
#   SKILLS_AGENT_CMD is the fallback for older setups. Layer 2/3 tasks use
#   SKILLS_AGENT_CMD for an editing agent, so set SKILLS_ACTIVATION_CMD when
#   both run in one environment.
#
# Example (OpenCode, free model, no key; or evals/runner/claude-activation.sh):
#   export SKILLS_ACTIVATION_CMD="$PWD/evals/runner/opencode-activation.sh"
#   ./scripts/run-activation-evals.sh
#
# Without an activation command, the script runs in --dry mode: it validates that
# every skill has both eval files and lists the prompts, without calling a model.
#
# A skill counts as activated when the output names it as a whole entry. The
# first agent error stops the run with exit 1, so a failing provider never
# reads as "no activation".
#
# Wrapper: the logic is TypeScript in tools/src/activation.ts (plan WP10 step
# 4). Needs Node 24 or newer.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$ROOT/tools/bin/activation.ts" "$@"
