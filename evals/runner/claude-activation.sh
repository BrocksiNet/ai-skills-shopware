#!/usr/bin/env bash
#
# SKILLS_AGENT_CMD adapter for Layer 1 activation evals with the Claude Code CLI.
#
# Reads a prompt on stdin, runs it in a fresh, empty workspace whose only
# project skills are this repo's skills/ (symlinked as .claude/skills), and
# prints the name of every skill the model invoked, one per line.
#
#   export SKILLS_AGENT_CMD="$PWD/evals/runner/claude-activation.sh"
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

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SKILLS_DIR="${ACTIVATION_SKILLS_DIR:-$ROOT/skills}"
MODEL="${ACTIVATION_MODEL:-sonnet}"
MAX_TURNS="${ACTIVATION_MAX_TURNS:-3}"

command -v claude >/dev/null || { echo "claude CLI not found" >&2; exit 2; }

workspace="$(mktemp -d "${TMPDIR:-/tmp}/skills-activation.XXXXXX")"
trap 'rm -rf "$workspace"' EXIT
mkdir -p "$workspace/.claude"
ln -s "$SKILLS_DIR" "$workspace/.claude/skills"

prompt="$(cat)"

(
  cd "$workspace"
  printf '%s' "$prompt" | claude -p \
    --setting-sources project \
    --model "$MODEL" \
    --tools Skill Read Glob Grep \
    --max-turns "$MAX_TURNS" \
    --no-session-persistence \
    --output-format stream-json --verbose
) | python3 -I -c '
import json, sys
seen = []
result = None
for line in sys.stdin:
    try:
        msg = json.loads(line)
    except ValueError:
        continue
    if msg.get("type") == "result":
        result = msg
    if msg.get("type") != "assistant":
        continue
    for block in msg.get("message", {}).get("content", []):
        if block.get("type") == "tool_use" and block.get("name") == "Skill":
            args = block.get("input") or {}
            name = args.get("skill") or args.get("command") or ""
            name = name.lstrip("/").split(":")[-1].strip()
            if name and name not in seen:
                seen.append(name)
if result is None:
    sys.exit("Activation session ended without a result; no score recorded.")
if result.get("is_error") or result.get("subtype") != "success":
    detail = result.get("result") or result.get("subtype") or "unknown error"
    sys.exit(f"Activation session failed: {detail}")
print("\n".join(seen))
'
