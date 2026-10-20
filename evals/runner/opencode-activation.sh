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
#   ACTIVATION_MODEL       provider/model (default: opencode/nemotron-3-ultra-free)
#   ACTIVATION_MAX_TURNS   agent steps per prompt (default: 3)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SKILLS_DIR="${ACTIVATION_SKILLS_DIR:-$ROOT/skills}"
MODEL="${ACTIVATION_MODEL:-opencode/nemotron-3-ultra-free}"
MAX_TURNS="${ACTIVATION_MAX_TURNS:-3}"

command -v opencode >/dev/null || { echo "opencode CLI not found" >&2; exit 2; }
[[ "$MAX_TURNS" =~ ^[1-9][0-9]*$ ]] || { echo "ACTIVATION_MAX_TURNS must be >= 1" >&2; exit 2; }

scratch="$(mktemp -d "${TMPDIR:-/tmp}/skills-activation.XXXXXX")"
trap 'rm -rf "$scratch"' EXIT
workspace="$scratch/ws"
mkdir -p "$workspace/.agents"
ln -s "$SKILLS_DIR" "$workspace/.agents/skills"

export HOME="$scratch/home"
export XDG_CONFIG_HOME="$HOME/.config" XDG_DATA_HOME="$HOME/.local/share"
export XDG_CACHE_HOME="$HOME/.cache" XDG_STATE_HOME="$HOME/.local/state"
mkdir -p "$XDG_CONFIG_HOME" "$XDG_DATA_HOME" "$XDG_CACHE_HOME" "$XDG_STATE_HOME"
export OPENCODE_DISABLE_AUTOUPDATE=1 OPENCODE_DISABLE_LSP_DOWNLOAD=1
OPENCODE_CONFIG_CONTENT="$(printf '{"agent":{"build":{"steps":%s}},"permission":{"edit":"deny","bash":"deny","webfetch":"deny","websearch":"deny","task":"deny","question":"deny"}}' "$MAX_TURNS")"
export OPENCODE_CONFIG_CONTENT

prompt="$(cat)"

(
  cd "$workspace"
  opencode run --standalone --auto --format json -m "$MODEL" "$prompt"
) | python3 -I -c '
import json, sys
seen, errors, events = [], [], 0
for line in sys.stdin:
    try:
        ev = json.loads(line)
    except ValueError:
        continue
    events += 1
    if ev.get("type") == "error":
        err = ev.get("error") or {}
        errors.append(err.get("message") or err.get("type") or "unknown error")
    if ev.get("type") != "tool_use":
        continue
    part = ev.get("part") or {}
    if part.get("tool") != "skill":
        continue
    args = (part.get("state") or {}).get("input") or {}
    name = args.get("id") or args.get("name") or args.get("skill") or ""
    name = str(name).lstrip("/").split(":")[-1].strip()
    if name and name not in seen:
        seen.append(name)
if errors:
    sys.exit("Activation session failed: %s" % errors[0])
if events == 0:
    sys.exit("Activation session produced no events; no score recorded.")
print("\n".join(seen))
'
