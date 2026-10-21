#!/usr/bin/env bash
#
# SKILLS_PROFILE_CMD adapter: turn this repo's skills on or off for ONE eval
# workdir, so the A/B "on" and "off" runs really differ.
#
#   skills-profile.sh on  <workdir> [task]
#   skills-profile.sh off <workdir> [task]
#
# on:  symlinks the task's skills (evals/tasks/<task>/skills, one name per
#      line; all skills when the file is missing) into <workdir>/.claude/skills
#      and <workdir>/.agents/skills.
# off: removes both folders. Pair it with an agent that ignores user-level
#      skills, otherwise skills installed on the machine leak into the "off"
#      run. claude-task.sh passes --setting-sources project; opencode-task.sh
#      runs with a throwaway HOME. Both read the two folders above.
#
# The adapter is TypeScript in tools/ (plan WP10); this wrapper keeps the
# path that evals.yml, the scripts and the docs use. Needs Node 24.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
exec node "$ROOT/tools/bin/skills-profile.ts" "$@"
