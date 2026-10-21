#!/usr/bin/env bash
#
# Wrapper: the eval diff tool is TypeScript in tools/bin/eval-diff.ts (plan WP10).
# Kept so evals.yml calls it unchanged.
# Needs Node 24 or newer.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$ROOT/tools/bin/eval-diff.ts" "$@"
