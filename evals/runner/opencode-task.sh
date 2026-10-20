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
#   TASK_MODEL            provider/model (default: opencode/longcat-2.5-preview-free)
#   TASK_MAX_TURNS        agent steps per task (default: 12)
#   TASK_TIMEOUT_SECONDS  wall clock per session (default: 600)
#   OPENCODE_ISOLATE      1 = throwaway HOME/XDG (default); 0 = your own config
#   EVAL_SKILLS_LOG       when set, this file is created and gets one line per
#                         skill the agent loaded (set by ab.sh)
#   Provider keys such as OPENROUTER_API_KEY pass through when you pick a
#   non-free TASK_MODEL.
#
# Free models are offered "for a limited time" and change often. List the
# current ones with: opencode models --standalone | grep -E 'free|pickle'
# Some free providers log prompts to improve their models. Eval fixtures are
# public code, so that is acceptable here; do not point this at private code.
#
# Permissions are auto-approved because the workdir is a throwaway temp copy of
# a fixture. Do not point this adapter at a real checkout.
set -euo pipefail

MODEL="${TASK_MODEL:-opencode/longcat-2.5-preview-free}"
MAX_TURNS="${TASK_MAX_TURNS:-12}"
TIMEOUT="${TASK_TIMEOUT_SECONDS:-600}"

command -v opencode >/dev/null || { echo "opencode CLI not found" >&2; exit 4; }
[[ "$MAX_TURNS" =~ ^[1-9][0-9]*$ ]] || { echo "TASK_MAX_TURNS must be >= 1" >&2; exit 4; }
[[ "$TIMEOUT" =~ ^[1-9][0-9]*$ ]] || { echo "TASK_TIMEOUT_SECONDS must be >= 1" >&2; exit 4; }

prompt="$(cat)"

scratch="$(mktemp -d "${TMPDIR:-/tmp}/opencode-task.XXXXXX")"
trap 'rm -rf "$scratch"' EXIT

if [[ "${OPENCODE_ISOLATE:-1}" == "1" ]]; then
  export HOME="$scratch/home"
  export XDG_CONFIG_HOME="$HOME/.config" XDG_DATA_HOME="$HOME/.local/share"
  export XDG_CACHE_HOME="$HOME/.cache" XDG_STATE_HOME="$HOME/.local/state"
  mkdir -p "$XDG_CONFIG_HOME" "$XDG_DATA_HOME" "$XDG_CACHE_HOME" "$XDG_STATE_HOME"
fi
export OPENCODE_DISABLE_AUTOUPDATE=1 OPENCODE_DISABLE_LSP_DOWNLOAD=1
# Cap the agent loop; a headless run must never stop to ask a question.
OPENCODE_CONFIG_CONTENT="$(printf '{"agent":{"build":{"steps":%s}},"permission":{"question":"deny"}}' "$MAX_TURNS")"
export OPENCODE_CONFIG_CONTENT

events="$scratch/events.jsonl"

# Portable timeout: GNU `timeout` is missing on macOS.
set +e
opencode run --standalone --auto --format json -m "$MODEL" "$prompt" >"$events" 2>"$scratch/stderr" &
pid=$!
# The watchdog must not hold our stdout open: run-task.sh pipes it into tee,
# which would otherwise wait for the sleep to end.
(
  sleep "$TIMEOUT" &
  sleeper=$!
  trap 'kill "$sleeper" 2>/dev/null; exit 0' TERM
  wait "$sleeper"
  kill -TERM "$pid" 2>/dev/null && touch "$scratch/timed-out"
) </dev/null >/dev/null 2>&1 &
watchdog=$!
wait "$pid"
rc=$?
kill -TERM "$watchdog" 2>/dev/null
wait "$watchdog" 2>/dev/null
set -e

parse_rc=0
python3 -I - "$events" "${EVAL_SKILLS_LOG:-}" <<'PY' || parse_rc=$?
import json, sys
texts, tools, errors, skills = [], 0, [], []
with open(sys.argv[1], encoding="utf-8", errors="replace") as fh:
    for line in fh:
        try:
            ev = json.loads(line)
        except ValueError:
            continue
        kind = ev.get("type")
        if kind == "text":
            text = (ev.get("part") or {}).get("text", "")
            if text.strip():
                texts.append(text)
        elif kind == "tool_use":
            tools += 1
            part = ev.get("part") or {}
            if part.get("tool") == "skill":
                args = (part.get("state") or {}).get("input") or {}
                name = str(args.get("id") or args.get("name") or "").strip()
                if name and name not in skills:
                    skills.append(name)
        elif kind == "error":
            err = ev.get("error") or {}
            errors.append(err.get("message") or err.get("type") or "unknown error")
print("\n\n".join(texts))
if len(sys.argv) > 2 and sys.argv[2]:
    with open(sys.argv[2], "a", encoding="utf-8") as log:
        log.writelines(s + "\n" for s in skills)
if errors:
    sys.stderr.write("opencode-task: %s\n" % errors[0])
    sys.exit(4)
if not texts and tools == 0:
    sys.stderr.write("opencode-task: session produced no text and no tool call\n")
    sys.exit(4)
PY

if [[ -e "$scratch/timed-out" ]]; then
  echo "opencode-task: timed out after ${TIMEOUT}s" >&2
  exit 4
fi
if [[ "$parse_rc" -ne 0 || "$rc" -ne 0 ]]; then
  if [[ "$rc" -ne 0 ]]; then
    echo "opencode-task: opencode exited $rc" >&2
    tail -n 5 "$scratch/stderr" >&2 || true
  fi
  exit 4
fi
exit 0
