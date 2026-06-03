#!/usr/bin/env bash
#
# Layer 2 runner: run a single behavioral eval task once.
#
#   ./run-task.sh <task-name> [on|off]
#
# Copies the task fixture into a temp working dir, (optionally) enables/disables
# the skill set, invokes the agent with the task instruction, captures the
# transcript, then runs the task's grade.sh.
#
# Required:
#   SKILLS_AGENT_CMD  - reads the prompt on stdin, works in CWD, prints transcript to stdout.
# Optional (for true A/B; otherwise toggle the skill set by hand):
#   SKILLS_PROFILE_ON_CMD  / SKILLS_PROFILE_OFF_CMD  - enable/disable the skill set for your tool.
set -euo pipefail

TASK="${1:?usage: run-task.sh <task-name> [on|off]}"
MODE="${2:-on}"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TASK_DIR="$ROOT/evals/tasks/$TASK"
[ -d "$TASK_DIR" ] || { echo "Unknown task: $TASK" >&2; exit 2; }

WORKDIR="$(mktemp -d)"
TRANSCRIPT="$WORKDIR/.transcript.txt"
trap 'rm -rf "$WORKDIR"' EXIT

if [ -d "$TASK_DIR/fixture" ]; then
  cp -R "$TASK_DIR/fixture/." "$WORKDIR/"
fi

case "$MODE" in
  on)  [ -n "${SKILLS_PROFILE_ON_CMD:-}" ]  && eval "$SKILLS_PROFILE_ON_CMD"  ;;
  off) [ -n "${SKILLS_PROFILE_OFF_CMD:-}" ] && eval "$SKILLS_PROFILE_OFF_CMD" ;;
  *) echo "mode must be on|off" >&2; exit 2 ;;
esac

prompt="$(cat "$TASK_DIR/instruction.md")"

if [ -z "${SKILLS_AGENT_CMD:-}" ]; then
  echo "SKILLS_AGENT_CMD not set -> cannot run the agent. Printing the task only:"
  echo "----- task: $TASK (mode=$MODE) -----"
  echo "$prompt"
  echo "----- workdir: $WORKDIR (fixture copied) -----"
  exit 3
fi

( cd "$WORKDIR" && printf '%s' "$prompt" | eval "$SKILLS_AGENT_CMD" ) | tee "$TRANSCRIPT"

echo "----- grading ($TASK, mode=$MODE) -----"
WORKDIR="$WORKDIR" TRANSCRIPT="$TRANSCRIPT" bash "$TASK_DIR/grade.sh"
