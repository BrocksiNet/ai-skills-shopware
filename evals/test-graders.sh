#!/usr/bin/env bash
#
# Golden tests for eval task graders (no model calls).
#
#   ./evals/test-graders.sh              # all tasks
#   ./evals/test-graders.sh no-empty-explicit
#
# Each task with grade.sh is checked:
#   - fixture/                    → grader must FAIL (pristine / starting state)
#   - fixtures/fail/              → grader must FAIL (sneak / almost-pass)
#   - fixtures/pass/              → grader must PASS (when present)
# Both fixture/ and fixtures/fail/ run when both exist. A task may drop a
# `.skip-fixture-grade` marker when fixture/ is only the agent start dir
# (grader is allowed to pass on the pristine tree).
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TASKS_ROOT="${ROOT}/evals/tasks"

errors=0

err() {
  printf '  FAIL: %s\n' "$*" >&2
  errors=$((errors + 1))
}

ok() {
  printf '  OK: %s\n' "$*"
}

run_grader() {
  local task="$1"
  local label="$2"
  local src_dir="$3"
  local expect_pass="$4"
  local task_dir="${TASKS_ROOT}/${task}"
  local workdir transcript rc=0

  workdir="$(mktemp -d)"
  transcript="${workdir}/.transcript.txt"

  if [[ -f "${src_dir}/.transcript.txt" ]]; then
    cp "${src_dir}/.transcript.txt" "${transcript}"
  else
    : > "${transcript}"
  fi

  if [[ -d "${src_dir}" ]]; then
    cp -R "${src_dir}/." "${workdir}/"
    rm -f "${workdir}/.transcript.txt"
    if [[ -f "${src_dir}/.transcript.txt" ]]; then
      cp "${src_dir}/.transcript.txt" "${transcript}"
    fi
  fi

  set +e
  WORKDIR="${workdir}" TRANSCRIPT="${transcript}" bash "${task_dir}/grade.sh" >/dev/null 2>&1
  rc=$?
  set -e
  rm -rf "${workdir}"

  if [[ "${expect_pass}" == "pass" && "${rc}" -eq 0 ]]; then
    ok "${task} (${label})"
  elif [[ "${expect_pass}" == "fail" && "${rc}" -ne 0 ]]; then
    ok "${task} (${label})"
  else
    err "${task} (${label}): expected ${expect_pass}, exit ${rc}"
  fi
}

test_task() {
  local task="$1"
  local task_dir="${TASKS_ROOT}/${task}"

  [[ -f "${task_dir}/grade.sh" ]] || {
    err "${task}: missing grade.sh"
    return
  }

  printf 'task: %s\n' "${task}"

  ran_fail=0
  if [[ -d "${task_dir}/fixture" && ! -f "${task_dir}/.skip-fixture-grade" ]]; then
    run_grader "${task}" "fixture" "${task_dir}/fixture" fail
    ran_fail=1
  fi
  if [[ -d "${task_dir}/fixtures/fail" ]]; then
    run_grader "${task}" "fixtures/fail" "${task_dir}/fixtures/fail" fail
    ran_fail=1
  fi
  if [[ "${ran_fail}" -eq 0 ]]; then
    err "${task}: no fixture/ or fixtures/fail/ for negative case"
  fi

  if [[ -d "${task_dir}/fixtures/pass" ]]; then
    run_grader "${task}" "fixtures/pass" "${task_dir}/fixtures/pass" pass
  else
    printf '  skip: no fixtures/pass/\n'
  fi
}

ensure_ast_tools() {
  local ast="${ROOT}/evals/tools/ast"
  local task_dir uses_ast=0

  for task_dir in "${TASKS_ROOT}"/*/; do
    if [[ -f "${task_dir}/grade.sh" ]] && grep -q 'evals/tools/ast' "${task_dir}/grade.sh"; then
      uses_ast=1
      break
    fi
  done

  if [[ "${uses_ast}" -eq 1 && ! -d "${ast}/node_modules" ]]; then
    printf 'test-graders: AST tools missing. Run: cd evals/tools/ast && npm ci\n' >&2
    exit 2
  fi
}

main() {
  local task

  ensure_ast_tools

  if [[ $# -gt 0 ]]; then
    for task in "$@"; do
      test_task "${task}"
    done
  else
    for task_dir in "${TASKS_ROOT}"/*/; do
      task="$(basename "${task_dir}")"
      [[ -f "${task_dir}/grade.sh" ]] || continue
      test_task "${task}"
    done
  fi

  if [[ "${errors}" -gt 0 ]]; then
    printf '\ntest-graders: %s failure(s)\n' "${errors}" >&2
    exit 1
  fi

  printf '\ntest-graders: OK\n'
}

main "$@"
