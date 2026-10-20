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
set -euo pipefail

MODE="${1:?usage: skills-profile.sh on|off <workdir> [task]}"
WORKDIR="${2:?usage: skills-profile.sh on|off <workdir> [task]}"
TASK="${3:-}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SKILLS_ROOT="${ROOT}/skills"

task_skills() {
  local file="${ROOT}/evals/tasks/${TASK}/skills"
  if [[ -n "${TASK}" && -f "${file}" ]]; then
    grep -v '^#' "${file}" | grep -v '^[[:space:]]*$' || true
  else
    find "${SKILLS_ROOT}" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort
  fi
}

case "${MODE}" in
  on)
    mkdir -p "${WORKDIR}/.claude/skills" "${WORKDIR}/.agents/skills"
    count=0
    while IFS= read -r skill; do
      [[ -d "${SKILLS_ROOT}/${skill}" ]] || { echo "skills-profile: unknown skill '${skill}'" >&2; exit 2; }
      ln -sfn "${SKILLS_ROOT}/${skill}" "${WORKDIR}/.claude/skills/${skill}"
      ln -sfn "${SKILLS_ROOT}/${skill}" "${WORKDIR}/.agents/skills/${skill}"
      count=$((count + 1))
    done < <(task_skills)
    [[ "${count}" -gt 0 ]] || { echo "skills-profile: no skills selected for '${TASK}'" >&2; exit 2; }
    ;;
  off)
    rm -rf "${WORKDIR}/.claude/skills" "${WORKDIR}/.agents/skills"
    ;;
  *)
    echo "skills-profile: mode must be on|off" >&2
    exit 2
    ;;
esac
