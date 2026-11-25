#!/usr/bin/env bash
# Grader: mcp-write-tool-dry-run
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec "${ROOT}/evals/tools/ast/run-grade.sh" mcp-write-tool-dry-run
