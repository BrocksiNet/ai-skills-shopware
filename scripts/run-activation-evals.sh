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
#   SKILLS_AGENT_CMD must read a prompt on stdin and print, to stdout, the
#   names of the skills it activated (one per line, or space/comma separated).
#   The skill name is the folder name (== SKILL.md `name`).
#
# Example (pseudo):
#   export SKILLS_AGENT_CMD='my-agent --print-activated-skills'
#   ./scripts/run-activation-evals.sh
#
# Without SKILLS_AGENT_CMD set, the script runs in --dry mode: it validates that
# every skill has both eval files and counts the prompts, without calling a model.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$ROOT/skills"

pass=0
fail=0
missing=0

run_prompt() { # $1 = prompt ; prints activated skill names
  printf '%s' "$1" | eval "$SKILLS_AGENT_CMD"
}

extract_prompts() { # $1 = file ; prints one prompt per line
  # Prompts are markdown list items beginning with "- ".
  grep -E '^- ' "$1" 2>/dev/null | sed -E 's/^- //' || true
}

check() { # $1 = skill ; $2 = file ; $3 = expectation (trigger|no-trigger)
  local skill="$1" file="$2" expect="$3"
  [ -f "$file" ] || { echo "  MISSING: $file"; missing=$((missing+1)); return; }

  while IFS= read -r prompt; do
    [ -z "$prompt" ] && continue
    if [ -z "${SKILLS_AGENT_CMD:-}" ]; then
      echo "  [dry] ($expect) $skill <- ${prompt:0:60}..."
      continue
    fi
    local activated
    activated="$(run_prompt "$prompt" || true)"
    if echo "$activated" | grep -qw "$skill"; then
      got="triggered"
    else
      got="quiet"
    fi
    if { [ "$expect" = "trigger" ] && [ "$got" = "triggered" ]; } ||
       { [ "$expect" = "no-trigger" ] && [ "$got" = "quiet" ]; }; then
      pass=$((pass+1))
    else
      fail=$((fail+1))
      echo "  FAIL ($expect, got $got) $skill <- $prompt"
    fi
  done < <(extract_prompts "$file")
}

if [ -z "${SKILLS_AGENT_CMD:-}" ]; then
  echo "SKILLS_AGENT_CMD not set -> running in --dry mode (no model calls)."
  echo "Set it to an agent that prints activated skill names to validate for real."
  echo
fi

for dir in "$SKILLS_DIR"/*/; do
  skill="$(basename "$dir")"
  echo "Skill: $skill"
  check "$skill" "$dir/evals/should-trigger.md" "trigger"
  check "$skill" "$dir/evals/should-not-trigger.md" "no-trigger"
done

echo
echo "Activation evals: pass=$pass fail=$fail missing-files=$missing"
if [ "$fail" -gt 0 ] || [ "$missing" -gt 0 ]; then
  exit 1
fi
