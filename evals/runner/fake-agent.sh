#!/usr/bin/env bash
#
# Test double for SKILLS_AGENT_CMD. No model calls. selftest.sh uses it to
# prove that run-task.sh, ab.sh, eval-gate.sh and the workflow wiring report
# what really happened.
#
# It reads the prompt on stdin (and ignores it), then acts on EVAL_TASK in the
# current workdir according to FAKE_AGENT_MODE:
#
#   skill-helps  (default) solve the task only when skills are loaded
#   skill-hurts  solve the task only when NO skills are loaded
#   always-pass  always solve the task
#   always-fail  never touch the workdir
#   error        exit 4 like a failed CLI/API session
#
# "Solve" means: replace the workdir with the task's golden fixtures/pass/.
#
# One-shot faults: FAKE_AGENT_ERROR_ONCE=<file> makes the first call (the one
# that creates <file>) an agent error; FAKE_AGENT_FAIL_ONCE=<file> makes it a
# no-change run.
#
# Skill-load reporting (EVAL_SKILLS_LOG, set by ab.sh) follows FAKE_AGENT_LOAD:
#
#   present      (default) log every skill present in the workdir
#   none         create the log but load nothing (model ignores skills)
#   leak         log php-foundation even when no skills are present
#   unsupported  never create the log (adapter cannot report)
#
# Token reporting (EVAL_USAGE_LOG, set by ab.sh) writes FAKE_AGENT_USAGE, an
# "<input> <output>" line. Default: "1200 200" with skills present, "1000 100"
# without. FAKE_AGENT_USAGE=none writes nothing (adapter cannot report).
set -euo pipefail

: "${EVAL_TASK:?EVAL_TASK not set (run through run-task.sh)}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PASS_DIR="${ROOT}/evals/tasks/${EVAL_TASK}/fixtures/pass"
MODE="${FAKE_AGENT_MODE:-skill-helps}"

cat >/dev/null

skills_loaded=0
if [[ -d .claude/skills ]] && [[ -n "$(ls -A .claude/skills 2>/dev/null)" ]]; then
  skills_loaded=1
fi

if [[ -n "${EVAL_SKILLS_LOG:-}" ]]; then
  case "${FAKE_AGENT_LOAD:-present}" in
    present)
      : >>"${EVAL_SKILLS_LOG}"
      if [[ -d .claude/skills ]]; then
        find .claude/skills -mindepth 1 -maxdepth 1 -exec basename {} \; >>"${EVAL_SKILLS_LOG}"
      fi
      ;;
    none) : >>"${EVAL_SKILLS_LOG}" ;;
    leak) echo php-foundation >>"${EVAL_SKILLS_LOG}" ;;
    unsupported) ;;
    *) echo "fake-agent: unknown FAKE_AGENT_LOAD" >&2; exit 2 ;;
  esac
fi

if [[ -n "${EVAL_USAGE_LOG:-}" ]]; then
  usage="${FAKE_AGENT_USAGE:-}"
  if [[ -z "${usage}" ]]; then
    if [[ "${skills_loaded}" -eq 1 ]]; then usage="1200 200"; else usage="1000 100"; fi
  fi
  [[ "${usage}" == none ]] || echo "${usage}" >>"${EVAL_USAGE_LOG}"
fi

solve() {
  [[ -d "${PASS_DIR}" ]] || { echo "fake-agent: ${EVAL_TASK} has no fixtures/pass" >&2; exit 4; }
  find . -mindepth 1 -maxdepth 1 ! -name .claude ! -name .agents ! -name .transcript.txt -exec rm -rf {} +
  cp -R "${PASS_DIR}/." .
  if [[ -f "${PASS_DIR}/.transcript.txt" ]]; then
    cat "${PASS_DIR}/.transcript.txt"
  fi
  echo "fake-agent: solved ${EVAL_TASK}"
}

no_change() {
  echo "fake-agent: no change"
}

if [[ -n "${FAKE_AGENT_ERROR_ONCE:-}" && ! -e "${FAKE_AGENT_ERROR_ONCE}" ]]; then
  : >"${FAKE_AGENT_ERROR_ONCE}"
  echo "fake-agent: simulated one-off API error" >&2
  exit 4
fi
if [[ -n "${FAKE_AGENT_FAIL_ONCE:-}" && ! -e "${FAKE_AGENT_FAIL_ONCE}" ]]; then
  : >"${FAKE_AGENT_FAIL_ONCE}"
  no_change
  exit 0
fi

case "${MODE}" in
  skill-helps) if [[ "${skills_loaded}" -eq 1 ]]; then solve; else no_change; fi ;;
  skill-hurts) if [[ "${skills_loaded}" -eq 0 ]]; then solve; else no_change; fi ;;
  always-pass) solve ;;
  always-fail) no_change ;;
  error) echo "fake-agent: simulated API error" >&2; exit 4 ;;
  *) echo "fake-agent: unknown FAKE_AGENT_MODE '${MODE}'" >&2; exit 2 ;;
esac
