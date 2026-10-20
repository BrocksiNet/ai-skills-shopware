#!/usr/bin/env bash
#
# Wrapper: the eval plan tool is TypeScript in tools/bin/eval-plan.ts (plan WP10).
# Kept so evals.yml, eval-local.sh and the runner self-test call it unchanged.
# Needs Node 24 or newer.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$ROOT/tools/bin/eval-plan.ts" "$@"
