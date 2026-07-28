#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=common.sh
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

smoke_task_skills() {
  local task="$1"
  local skills_file="${TASKS_ROOT}/${task}/skills"

  if [[ -f "${skills_file}" ]]; then
    grep -v '^#' "${skills_file}" | grep -v '^[[:space:]]*$' | tr '\n' ' '
  else
    printf '%s' "${SMOKE_SKILLS}"
  fi
}

smoke_profile_on() {
  local workdir="$1"
  local task="${2:-}"
  local skills skill provider dir target

  if [[ -n "${task}" ]]; then
    skills="$(smoke_task_skills "${task}")"
  else
    skills="${SMOKE_SKILLS}"
  fi

  for provider in claude; do
    mkdir -p "${workdir}/.${provider}/skills"
  done
  mkdir -p "${workdir}/.agents/skills"

  for skill in ${skills}; do
    [[ -d "${SKILLS_ROOT}/${skill}" ]] || smoke_die "skill not found: ${skill}"
    ln -sfn "${SKILLS_ROOT}/${skill}" "${workdir}/.claude/skills/${skill}"
    ln -sfn "${SKILLS_ROOT}/${skill}" "${workdir}/.agents/skills/${skill}"
  done
}

smoke_profile_off() {
  local workdir="$1"
  rm -rf \
    "${workdir}/.claude/skills" \
    "${workdir}/.agents/skills"
}
