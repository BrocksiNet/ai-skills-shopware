#!/usr/bin/env bash
# Grader: bc-change-not-deprecated-reason
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec "${ROOT}/evals/tools/ast/run-grade.sh" bc-change-not-deprecated-reason
