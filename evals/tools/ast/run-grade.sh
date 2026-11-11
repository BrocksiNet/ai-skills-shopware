#!/usr/bin/env bash
# Shared entry for the grade.sh of AST-backed tasks; tools/bin/grade.ts runs
# that grade.sh. Do not call from Harbor directly.
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
TASK="${1:?task name required}"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! -d "${HERE}/node_modules" ]]; then
  echo "score=0 (ast tools not installed: cd evals/tools/ast && npm ci)" >&2
  exit 2
fi

exec node "${HERE}/bin/grade.mjs" "${TASK}"
