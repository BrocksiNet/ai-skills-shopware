#!/usr/bin/env bash
# Grader: admin-js-implementation-to-ts
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec "${ROOT}/evals/tools/ast/run-grade.sh" admin-js-implementation-to-ts
