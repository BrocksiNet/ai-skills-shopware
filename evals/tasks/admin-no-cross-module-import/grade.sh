#!/usr/bin/env bash
# Grader: admin-no-cross-module-import
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec "${ROOT}/evals/tools/ast/run-grade.sh" admin-no-cross-module-import
