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
#                       legacy global hooks, run by bash without arguments;
#                       WORKDIR, TASK and ROOT are in their environment.
#
# Timeout: EVAL_AGENT_TIMEOUT_SECONDS (default 0 = none) stops the agent and
# every process it started; the run is an agent error. An agent that exits
# while a child still holds its output open does not block grading.
#
# Retries: an agent error (exit 4, e.g. "Rate limit exceeded" on free models)
# is retried up to EVAL_AGENT_RETRIES times (default 2), EVAL_AGENT_RETRY_WAIT
# seconds apart (default 60), each time on a fresh copy of the fixture so a
# half-finished attempt never leaks into the next one. The last error reason
# goes to stderr. A used-up quota ("Free usage limit reached", "exceeded your
# monthly quota", ...) is not retried: it exits 6, and ab.sh then skips every
# later run that writes to the same results file.
#
# API facts: with EVAL_API_FACTS=1, a task's recorded `api-facts.txt` (the
# output of tools/api-index/bin/api-facts.ts for its fixture) is appended to
# the instruction. Tasks without the file run unchanged.
#
# The agent sees EVAL_TASK in its environment. Real agents ignore it; the
# test double (fake-agent.sh) uses it to find the task fixtures.
#
# Exit codes:
#   0  graded PASS
#   1  graded FAIL
#   2  usage error / unknown task / profile failure
#   3  SKILLS_AGENT_CMD not set (task printed, nothing graded)
#   4  agent error (CLI/API failure); not a task result
#   6  the agent's quota is used up; not a task result, not retried
set -euo pipefail
# The runner is TypeScript in tools/bin/run-task.ts (plan WP10); this wrapper
# keeps the path that evals.yml, eval-local.sh and the docs call. Needs Node 24.
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
exec node "$ROOT/tools/bin/run-task.ts" "$@"
