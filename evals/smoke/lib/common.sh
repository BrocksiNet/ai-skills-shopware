#!/usr/bin/env bash
set -euo pipefail

SMOKE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "${SMOKE_ROOT}/../.." && pwd)"
TASKS_ROOT="${REPO_ROOT}/evals/tasks"
SKILLS_ROOT="${REPO_ROOT}/skills"

if [[ -f "${SMOKE_ROOT}/smoke.env" ]]; then
  # shellcheck source=/dev/null
  source "${SMOKE_ROOT}/smoke.env"
fi

: "${SMOKE_SKILLS:=php-foundation shopware-testing shopware-review-learnings}"
: "${SMOKE_TASKS:=no-empty-explicit backed-enum-over-constants unit-test-passes clock-interface-injection unit-test-exception-object interface-di-repository cache-tag-no-deprecated-event phpstan-baseline-guardrail}"
: "${SMOKE_AGENTS:=claude codex}"
: "${SMOKE_CI:=0}"
: "${SMOKE_STRICT:=0}"

smoke_log() { printf '[smoke] %s\n' "$*" >&2; }
smoke_die() { smoke_log "ERROR: $*"; exit 1; }

smoke_task_dir() {
  local task="$1"
  local dir="${TASKS_ROOT}/${task}"
  [[ -d "${dir}" ]] || smoke_die "unknown task: ${task}"
  [[ -f "${dir}/instruction.md" && -f "${dir}/grade.sh" ]] || smoke_die "task incomplete: ${task}"
  printf '%s' "${dir}"
}

smoke_list_tasks() {
  local task
  for task in "${SMOKE_TASKS}"; do
    printf '%s\n' "${task}"
  done
}

smoke_grader_dry_run() {
  local task="$1"
  (
    local task_dir workdir
    task_dir="$(smoke_task_dir "${task}")"
    workdir="$(mktemp -d)"
    trap 'rm -rf "${workdir}"' EXIT

    if [[ -d "${task_dir}/fixture" ]]; then
      cp -R "${task_dir}/fixture/." "${workdir}/"
    fi

    smoke_log "grader dry-run: ${task}"
    if WORKDIR="${workdir}" TRANSCRIPT=/dev/null bash "${task_dir}/grade.sh"; then
      smoke_log "  grader expects PASS on pristine fixture (sanity) — may FAIL by design"
    else
      smoke_log "  grader FAIL on fixture-only (expected before agent edits)"
    fi
  )
}
