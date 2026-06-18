#!/usr/bin/env bash
#
# Local smoke evals: run eval tasks with skills ON vs OFF and compare agents.
#
#   ./evals/smoke/smoke.sh agents
#   ./evals/smoke/smoke.sh graders
#   ./evals/smoke/smoke.sh run  --agent claude --task no-empty-explicit --mode on
#   ./evals/smoke/smoke.sh ab    --agent claude --task no-empty-explicit
#   ./evals/smoke/smoke.sh suite [--agent claude] [--task no-empty-explicit]
#
# Config: copy evals/smoke/smoke.env.example -> evals/smoke/smoke.env
#
# CI-ready: set SMOKE_CI=1 and provider API keys; unavailable agents are skipped
# unless SMOKE_CI=1 and zero agents run (then exit 1).
set -euo pipefail

SMOKE_ROOT="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib/common.sh
source "${SMOKE_ROOT}/lib/common.sh"
# shellcheck source=lib/profiles.sh
source "${SMOKE_ROOT}/lib/profiles.sh"
# shellcheck source=lib/agents.sh
source "${SMOKE_ROOT}/lib/agents.sh"

usage() {
  cat <<'EOF'
Usage:
  smoke.sh agents                     List configured agents and availability
  smoke.sh graders                    Verify graders on fixture-only workdirs
  smoke.sh run  --agent A --task T [--mode on|off]
  smoke.sh ab   --agent A --task T    Run ON and OFF; report whether skill helped
  smoke.sh suite [--agent A] [--task T]  Default task list (A/B per task)

Agents: claude | codex | cursor
Config: evals/smoke/smoke.env (from smoke.env.example)

Environment (CI):
  ANTHROPIC_API_KEY   — Claude Code
  OPENAI_API_KEY      — Codex
  CURSOR_API_KEY      — optional Cursor agent
  SMOKE_CI=1          — fail if no agent could run
EOF
}

smoke_run_task() {
  local agent="$1"
  local task="$2"
  local mode="${3:-on}"
  local result=0

  (
    set -euo pipefail
    local task_dir workdir transcript prompt

    [[ "${mode}" == "on" || "${mode}" == "off" ]] || smoke_die "mode must be on|off"
    smoke_require_agent "${agent}"
    task_dir="$(smoke_task_dir "${task}")"

    workdir="$(mktemp -d "${TMPDIR:-/tmp}/smoke-${task}-${mode}.XXXXXX")"
    transcript="${workdir}/.transcript.txt"
    if [[ "${SMOKE_KEEP_WORKDIR:-0}" != "1" ]]; then
      trap 'rm -rf "${workdir}"' EXIT
    else
      smoke_log "keeping workdir: ${workdir}"
    fi

    if [[ -d "${task_dir}/fixture" ]]; then
      cp -R "${task_dir}/fixture/." "${workdir}/"
    fi

    if [[ "${mode}" == "on" ]]; then
      smoke_profile_on "${workdir}" "${task}"
    else
      smoke_profile_off "${workdir}"
    fi

    prompt="$(<"${task_dir}/instruction.md")"
    smoke_agent_run "${agent}" "${workdir}" "${prompt}" || true

    smoke_log "grading ${task} (${agent}, skills=${mode})"
    if WORKDIR="${workdir}" TRANSCRIPT="${transcript}" bash "${task_dir}/grade.sh"; then
      smoke_log "PASS ${task} ${agent} skills=${mode}"
    else
      smoke_log "FAIL ${task} ${agent} skills=${mode}"
      if [[ -f "${transcript}" ]]; then
        smoke_log "transcript tail:"
        tail -n 8 "${transcript}" >&2 || true
      fi
      exit 1
    fi
  ) || result=1

  return "${result}"
}

smoke_ab_task() {
  local agent="$1"
  local task="$2"
  local on=0 off=0

  if smoke_run_task "${agent}" "${task}" on; then on=1; fi
  if smoke_run_task "${agent}" "${task}" off; then off=1; fi

  printf 'task=%s agent=%s on=%s off=%s' "${task}" "${agent}" "${on}" "${off}"
  if [[ "${on}" -eq 1 && "${off}" -eq 0 ]]; then
    printf ' => skill HELPS\n'
  elif [[ "${on}" -eq "${off}" ]]; then
    printf ' => no difference\n'
  elif [[ "${on}" -eq 0 && "${off}" -eq 1 ]]; then
    printf ' => skill HURTS (investigate)\n'
  else
    printf ' => both failed\n'
  fi

  [[ "${on}" -ge "${off}" ]]
}

cmd_suite() {
  local agent_filter="" task_filter="" agent task ran=0 failed=0

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --agent) agent_filter="$2"; shift 2 ;;
      --task) task_filter="$2"; shift 2 ;;
      *) smoke_die "unknown option: $1" ;;
    esac
  done

  for agent in ${SMOKE_AGENTS}; do
    [[ -z "${agent_filter}" || "${agent}" == "${agent_filter}" ]] || continue
    smoke_agent_available "${agent}" || {
      smoke_log "skip ${agent} (not available)"
      continue
    }

    for task in ${SMOKE_TASKS}; do
      [[ -z "${task_filter}" || "${task}" == "${task_filter}" ]] || continue
      ran=$((ran + 1))
      if ! smoke_ab_task "${agent}" "${task}"; then
        failed=$((failed + 1))
      fi
    done
  done

  if [[ "${ran}" -eq 0 ]]; then
    smoke_log "no agent runs executed"
    [[ "${SMOKE_CI}" == "1" ]] && exit 1
    exit 0
  fi

  smoke_log "suite done: ${ran} A/B runs, ${failed} without skill-on win"
  if [[ "${SMOKE_STRICT}" == "1" || "${SMOKE_CI}" == "1" ]] && [[ "${failed}" -gt 0 ]]; then
    exit 1
  fi
}

cmd_graders() {
  local task
  for task in ${SMOKE_TASKS}; do
    smoke_grader_dry_run "${task}" || true
  done
}

main() {
  local cmd="${1:-}"
  shift || true

  case "${cmd}" in
    agents) smoke_list_agents ;;
    graders) cmd_graders ;;
    run)
      local agent="" task="" mode="on"
      while [[ $# -gt 0 ]]; do
        case "$1" in
          --agent) agent="$2"; shift 2 ;;
          --task) task="$2"; shift 2 ;;
          --mode) mode="$2"; shift 2 ;;
          *) smoke_die "unknown option: $1" ;;
        esac
      done
      [[ -n "${agent}" && -n "${task}" ]] || smoke_die "run requires --agent and --task"
      smoke_run_task "${agent}" "${task}" "${mode}"
      ;;
    ab)
      local agent="" task=""
      while [[ $# -gt 0 ]]; do
        case "$1" in
          --agent) agent="$2"; shift 2 ;;
          --task) task="$2"; shift 2 ;;
          *) smoke_die "unknown option: $1" ;;
        esac
      done
      [[ -n "${agent}" && -n "${task}" ]] || smoke_die "ab requires --agent and --task"
      smoke_ab_task "${agent}" "${task}"
      ;;
    suite) cmd_suite "$@" ;;
    -h|--help|help|"") usage ;;
    *) smoke_die "unknown command: ${cmd} (try --help)" ;;
  esac
}

main "$@"
