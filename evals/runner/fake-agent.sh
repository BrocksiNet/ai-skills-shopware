#!/usr/bin/env bash
#
# Test double for SKILLS_AGENT_CMD. No model calls. Wrapper for
# tools/bin/fake-agent.ts; tools/src/fake-agent.ts documents FAKE_AGENT_MODE,
# FAKE_AGENT_LOAD, FAKE_AGENT_USAGE and the one-shot faults.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
exec node "$ROOT/tools/bin/fake-agent.ts" "$@"
