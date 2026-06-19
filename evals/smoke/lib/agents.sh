#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=common.sh
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

smoke_agent_bin() {
  local agent="$1"
  case "${agent}" in
    claude) command -v claude 2>/dev/null || true ;;
    codex) command -v codex 2>/dev/null || true ;;
    cursor)
      if command -v agent >/dev/null 2>&1; then
        command -v agent
      else
        command -v cursor-agent 2>/dev/null || true
      fi
      ;;
    *) smoke_die "unknown agent: ${agent}" ;;
  esac
}

smoke_cursor_load_auth_args() {
  SMOKE_CURSOR_AUTH_ARGS=()
  if [[ -n "${CURSOR_API_KEY:-}" && "${CURSOR_API_KEY}" == crsr_* ]]; then
    smoke_log "cursor: ignoring CURSOR_API_KEY (admin key); using browser login"
    return 0
  fi
  if [[ -n "${CURSOR_API_KEY:-}" ]]; then
    SMOKE_CURSOR_AUTH_ARGS=(--api-key "${CURSOR_API_KEY}")
  fi
}

smoke_cursor_probe() {
  local cursor_bin="$1"
  shift
  "${cursor_bin}" -p --output-format text "$@" "Reply with exactly: OK" </dev/null 2>&1
}

smoke_agent_auth_ok() {
  local agent="$1"
  case "${agent}" in
    claude)
      [[ -n "${ANTHROPIC_API_KEY:-}" ]] && return 0
      claude auth status >/dev/null 2>&1
      ;;
    codex)
      [[ -n "${OPENAI_API_KEY:-}" ]] && return 0
      codex login status >/dev/null 2>&1 || return 1
      ;;
    cursor)
      local cursor_bin probe
      cursor_bin="$(smoke_agent_bin cursor)"
      [[ -n "${cursor_bin}" ]] || return 1
      smoke_cursor_load_auth_args
      probe="$(smoke_cursor_probe "${cursor_bin}" "${SMOKE_CURSOR_AUTH_ARGS[@]}")" || true
      if [[ "${probe}" == *"Authentication required"* && ${#SMOKE_CURSOR_AUTH_ARGS[@]} -gt 0 ]]; then
        probe="$(smoke_cursor_probe "${cursor_bin}")" || return 1
      fi
      if [[ "${probe}" == *"Authentication required"* ]]; then
        return 1
      fi
      return 0
      ;;
  esac
}

smoke_agent_available() {
  local agent="$1"
  local bin
  bin="$(smoke_agent_bin "${agent}")"
  [[ -n "${bin}" ]] || return 1
  smoke_agent_auth_ok "${agent}"
}

smoke_agent_default_cmd() {
  local agent="$1"
  case "${agent}" in
    claude)
      printf '%s' "${SMOKE_CLAUDE_CMD:-claude -p --dangerously-skip-permissions --output-format text}"
      ;;
    codex)
      printf '%s' "${SMOKE_CODEX_CMD:-codex exec --dangerously-bypass-approvals-and-sandbox -s workspace-write --output-last-message}"
      ;;
    cursor)
      printf '%s' "${SMOKE_CURSOR_CMD:-cursor-agent -p --force --output-format text}"
      ;;
  esac
}

# Run agent in workdir; prompt as argument; transcript in ${workdir}/.transcript.txt
smoke_agent_run() {
  local agent="$1"
  local workdir="$2"
  local prompt="$3"
  local transcript_file="${workdir}/.transcript.txt"

  smoke_log "agent ${agent} in ${workdir}"

  case "${agent}" in
    claude)
      if [[ -n "${SMOKE_CLAUDE_CMD:-}" ]]; then
        ( cd "${workdir}" && eval "${SMOKE_CLAUDE_CMD}" ) 2>&1 | tee "${transcript_file}"
      else
        local claude_model_args=()
        if [[ -n "${SMOKE_CLAUDE_MODEL:-}" ]]; then
          claude_model_args=(--model "${SMOKE_CLAUDE_MODEL}")
        fi
        ( cd "${workdir}" && claude -p --dangerously-skip-permissions --tools default --output-format text \
          "${claude_model_args[@]}" "${prompt}" </dev/null ) \
          2>&1 | tee "${transcript_file}"
      fi
      ;;
    codex)
      if [[ -n "${SMOKE_CODEX_CMD:-}" ]]; then
        ( cd "${workdir}" && eval "${SMOKE_CODEX_CMD}" ) 2>&1 | tee "${transcript_file}"
      else
        ( cd "${workdir}" && codex exec --dangerously-bypass-approvals-and-sandbox -s workspace-write "${prompt}" </dev/null ) \
          2>&1 | tee "${transcript_file}"
      fi
      ;;
    cursor)
      local cursor_bin
      cursor_bin="$(smoke_agent_bin cursor)"
      smoke_cursor_load_auth_args
      if [[ -n "${SMOKE_CURSOR_CMD:-}" ]]; then
        ( cd "${workdir}" && eval "${SMOKE_CURSOR_CMD}" ) 2>&1 | tee "${transcript_file}"
      else
        ( cd "${workdir}" && "${cursor_bin}" -p --force --output-format text "${SMOKE_CURSOR_AUTH_ARGS[@]}" "${prompt}" </dev/null ) \
          2>&1 | tee "${transcript_file}"
      fi
      ;;
    *) smoke_die "unknown agent: ${agent}" ;;
  esac
}

smoke_list_agents() {
  local agent available=0
  for agent in ${SMOKE_AGENTS}; do
    if smoke_agent_available "${agent}"; then
      printf '%s\tready\n' "${agent}"
      available=$((available + 1))
    else
      printf '%s\tmissing (binary or auth)\n' "${agent}"
    fi
  done
  return 0
}

smoke_require_agent() {
  local agent="$1"
  smoke_agent_available "${agent}" || smoke_die "agent not available: ${agent} (install CLI or set API key — see docs/smoke-evals.md)"
}
