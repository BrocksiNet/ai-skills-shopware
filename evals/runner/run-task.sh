#!/usr/bin/env bash
#
# Layer 2 runner: run a single behavioral eval task once.
#
#   ./run-task.sh <task-name> [on|off]
#
# Copies the task fixture into a temp workdir, turns the skill set on or off
# for that workdir, invokes the agent with the task instruction, captures the
# transcript, removes the skill profile again, then runs the task's grade.sh.
#
# Required:
#   SKILLS_AGENT_CMD    reads the prompt on stdin, works in CWD, prints the
#                       transcript to stdout. Exit 0 when the session finished.
#                       Ready adapters: evals/runner/opencode-task.sh (free
#                       model, no key), evals/runner/claude-task.sh
# Skill profile (needed for a real A/B):
#   SKILLS_PROFILE_CMD  called as `<cmd> on|off <workdir> <task>`.
#                       Ready adapter: evals/runner/skills-profile.sh
#   SKILLS_PROFILE_ON_CMD / SKILLS_PROFILE_OFF_CMD
#                       legacy global hooks, eval'd without arguments.
#
# Retries: an agent error (exit 4, e.g. "Rate limit exceeded" on free models)
# is retried up to EVAL_AGENT_RETRIES times (default 2), EVAL_AGENT_RETRY_WAIT
# seconds apart (default 60), each time on a fresh copy of the fixture so a
# half-finished attempt never leaks into the next one. The last error reason
# goes to stderr.
#
# The agent sees EVAL_TASK in its environment. Real agents ignore it; the
# self-test double (fake-agent.sh) uses it to find the task fixtures.
#
# Exit codes:
#   0  graded PASS
#   1  graded FAIL
#   2  usage error / unknown task / profile failure
#   3  SKILLS_AGENT_CMD not set (task printed, nothing graded)
#   4  agent error (CLI/API failure); not a task result
set -euo pipefail

TASK="${1:?usage: run-task.sh <task-name> [on|off]}"
MODE="${2:-on}"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TASK_DIR="$ROOT/evals/tasks/$TASK"
[ -d "$TASK_DIR" ] || { echo "Unknown task: $TASK" >&2; exit 2; }
case "$MODE" in
  on|off) ;;
  *) echo "mode must be on|off" >&2; exit 2 ;;
esac

WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/eval-${TASK}.XXXXXX")"
TRANSCRIPT="$WORKDIR/.transcript.txt"
if [ -z "${KEEP_WORKDIR:-}" ]; then
  trap 'rm -rf "$WORKDIR"' EXIT
else
  echo "workdir kept: $WORKDIR" >&2
fi

fresh_workdir() {
  find "$WORKDIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  if [ -d "$TASK_DIR/fixture" ]; then
    cp -R "$TASK_DIR/fixture/." "$WORKDIR/"
  fi
}
fresh_workdir

profile() { # $1 = on|off
  if [ -n "${SKILLS_PROFILE_CMD:-}" ]; then
    "$SKILLS_PROFILE_CMD" "$1" "$WORKDIR" "$TASK" || { echo "profile $1 failed" >&2; exit 2; }
  elif [ "$1" = on ] && [ -n "${SKILLS_PROFILE_ON_CMD:-}" ]; then
    eval "$SKILLS_PROFILE_ON_CMD"
  elif [ "$1" = off ] && [ -n "${SKILLS_PROFILE_OFF_CMD:-}" ]; then
    eval "$SKILLS_PROFILE_OFF_CMD"
  fi
}

profile "$MODE"

prompt="$(cat "$TASK_DIR/instruction.md")"

if [ -z "${SKILLS_AGENT_CMD:-}" ]; then
  echo "SKILLS_AGENT_CMD not set -> cannot run the agent. Printing the task only:"
  echo "----- task: $TASK (mode=$MODE) -----"
  echo "$prompt"
  echo "----- workdir: $WORKDIR (fixture copied) -----"
  exit 3
fi

RETRIES="${EVAL_AGENT_RETRIES:-2}"
RETRY_WAIT="${EVAL_AGENT_RETRY_WAIT:-60}"
attempt=0
while :; do
  attempt=$((attempt + 1))
  agent_err="$(mktemp "${TMPDIR:-/tmp}/eval-agent-err.XXXXXX")"
  set +e
  ( cd "$WORKDIR" && export EVAL_TASK="$TASK" && printf '%s' "$prompt" | eval "$SKILLS_AGENT_CMD" ) 2>"$agent_err" | tee "$TRANSCRIPT"
  agent_status="${PIPESTATUS[0]}"
  set -e
  if [ "$agent_status" -eq 0 ]; then
    rm -f "$agent_err"
    break
  fi
  reason="$(tail -n 3 "$agent_err" | tr '\n' ' ' | sed 's/ *$//')"
  rm -f "$agent_err"
  if [ "$attempt" -gt "$RETRIES" ]; then
    echo "----- agent error ($TASK, mode=$MODE, exit $agent_status, attempt $attempt): ${reason:-no detail}; not graded -----" >&2
    exit 4
  fi
  echo "----- agent error ($TASK, mode=$MODE, attempt $attempt): ${reason:-no detail}; retrying in ${RETRY_WAIT}s -----" >&2
  sleep "$RETRY_WAIT"
  fresh_workdir
  profile "$MODE"
  if [ -n "${EVAL_SKILLS_LOG:-}" ]; then rm -f "$EVAL_SKILLS_LOG"; fi
  if [ -n "${EVAL_USAGE_LOG:-}" ]; then rm -f "$EVAL_USAGE_LOG"; fi
done

# Graders must see the agent's work only, not the symlinked skills.
if [ -n "${SKILLS_PROFILE_CMD:-}" ]; then
  "$SKILLS_PROFILE_CMD" off "$WORKDIR" "$TASK" || true
fi

echo "----- grading ($TASK, mode=$MODE) -----"
if WORKDIR="$WORKDIR" TRANSCRIPT="$TRANSCRIPT" bash "$TASK_DIR/grade.sh"; then
  exit 0
fi
exit 1
