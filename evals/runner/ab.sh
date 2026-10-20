#!/usr/bin/env bash
#
# Layer 3 runner: A/B ablation for one task. Runs it with the skill set ON
# and OFF, prints the comparison, and appends one JSON line to $EVAL_RESULTS.
#
#   ./ab.sh <task-name> [repeats]
#
# A skill that does not change the pass rate is not earning its context budget.
#
# A real A/B needs SKILLS_PROFILE_CMD (or the legacy ON/OFF hooks); without
# one, "on" and "off" load the same skills and the run is refused.
#
# Pass rates count completed runs only; an agent error is not a failed task.
# A gap smaller than EVAL_AB_MIN_DELTA_PCT points (default 50) is noise: with 3
# repeats, one run is 33 points, so "improved" and "worse" need two runs.
#
# Verdicts and exit codes:
#   improved       on rate - off rate >= min delta   exit 0
#   held           every completed run passed        exit 11
#   no_difference  gap below the min delta           exit 10
#   worse          off rate - on rate >= min delta   exit 20
#   error          fewer than half of the runs of a
#                  mode completed                    exit 5
#   usage error / no profile command                 exit 2
#   SKILLS_AGENT_CMD not set                         exit 3
#
# Env:
#   EVAL_RESULTS  JSONL output (default: <repo>/evals/.results/ab.jsonl)
#   EVAL_AGENT    label for the agent column (default: adapter name, e.g.
#                 `opencode` for opencode-task.sh)
#   TASK_MODEL    recorded as the model column (default: "default")
#
# Skill loads: ab.sh gives every run its own EVAL_SKILLS_LOG file. Adapters
# that support it (opencode-task.sh, claude-task.sh) list the skills they
# loaded there. "loaded_on" counts skill-on runs that loaded one of the task's
# skills; "loaded_off" counts skill-off runs that loaded any repo skill, which
# means skills leaked into the baseline. Both are null for adapters that do
# not report.
#
# Tokens: every run also gets EVAL_USAGE_LOG. Adapters write "<input> <output>"
# there. "tokens_on" / "tokens_off" are the averages over completed runs that
# reported, {"input":N,"output":N,"runs":N}, or null when none did.
set -euo pipefail
# The runner is TypeScript in tools/bin/ab.ts (plan WP10); this wrapper
# keeps the path that evals.yml, eval-local.sh and the docs call. Needs Node 24.
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
exec node "$ROOT/tools/bin/ab.ts" "$@"
