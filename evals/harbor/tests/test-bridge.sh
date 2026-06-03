#!/usr/bin/env bash
#
# Generic Harbor test bridge. Harbor runs this as tests/test.sh inside the task
# container after the agent has finished. It calls our deterministic grader for
# the corresponding eval task against the agent's working directory.
#
# Expects:
#   TASK_NAME  - the eval task name (set by task.toml / the generator).
#   $PWD       - the agent's working directory (Harbor convention).
# Optional:
#   REPO_DIR   - path to this skills repo inside the container (default: /skills-repo).
set -euo pipefail

TASK_NAME="${TASK_NAME:?TASK_NAME not set}"
REPO_DIR="${REPO_DIR:-/skills-repo}"
GRADER="$REPO_DIR/evals/tasks/$TASK_NAME/grade.sh"

[ -f "$GRADER" ] || { echo "grader not found: $GRADER" >&2; exit 2; }

# Harbor captures the agent transcript; expose it to the grader if present.
TRANSCRIPT="${HARBOR_TRANSCRIPT:-${PWD}/.transcript.txt}"
[ -f "$TRANSCRIPT" ] || TRANSCRIPT=/dev/null

WORKDIR="$PWD" TRANSCRIPT="$TRANSCRIPT" bash "$GRADER"
