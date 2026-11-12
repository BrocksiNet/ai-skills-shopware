#!/usr/bin/env bash
#
# Golden tests for eval task graders (no model calls). Wrapper for
# tools/bin/test-graders.ts (Node 26+).
#
#   ./evals/test-graders.sh              # all tasks
#   ./evals/test-graders.sh no-empty-explicit
#
# Each task (a folder with instruction.md) is graded by tools/bin/grade.ts:
#   - fixture/                    → grader must FAIL (pristine / starting state)
#   - fixtures/fail/              → grader must FAIL (sneak / almost-pass)
#   - fixtures/pass/              → grader must PASS (when present)
# Both fixture/ and fixtures/fail/ run when both exist. A task may drop a
# `.skip-fixture-grade` marker when fixture/ is only the agent start dir
# (grader is allowed to pass on the pristine tree).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$ROOT/tools/bin/test-graders.ts" "$@"
