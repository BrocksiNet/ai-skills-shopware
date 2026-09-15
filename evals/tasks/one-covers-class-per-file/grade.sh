#!/usr/bin/env bash
# Grader: one-covers-class-per-file
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec "${ROOT}/evals/tools/ast/run-grade.sh" one-covers-class-per-file
