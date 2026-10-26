#!/usr/bin/env bash
#
# Install a pinned agent CLI on a CI runner.
#
#   evals/runner/install-agent.sh opencode   # OPENCODE_VERSION (default 2.0.27)
#   evals/runner/install-agent.sh claude     # CLAUDE_CODE_VERSION (default 2.1.301)
#   evals/runner/install-agent.sh copilot    # COPILOT_VERSION (default 1.0.103)
#
# Adds the install folder to GITHUB_PATH when it runs inside GitHub Actions.
set -euo pipefail

agent="${1:-}"
case "$agent" in
  opencode)
    version="${OPENCODE_VERSION:-2.0.27}"
    installer="$(mktemp)"
    trap 'rm -f "$installer"' EXIT
    curl -fsSL https://opencode.ai/v2/install -o "$installer"
    bash "$installer" --version "$version" --no-modify-path
    bin="$HOME/.opencode/bin"
    if [[ -n "${GITHUB_PATH:-}" ]]; then echo "$bin" >>"$GITHUB_PATH"; fi
    "$bin/opencode" --version
    ;;
  claude)
    npm install -g "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION:-2.1.301}"
    claude --version
    ;;
  copilot)
    npm install -g "@github/copilot@${COPILOT_VERSION:-1.0.103}"
    copilot --version
    ;;
  *)
    echo "usage: $0 opencode|claude|copilot" >&2
    exit 2
    ;;
esac
