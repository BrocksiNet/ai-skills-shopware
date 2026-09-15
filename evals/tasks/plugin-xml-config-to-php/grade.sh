#!/usr/bin/env bash
# Grader: plugin-xml-config-to-php
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec "${ROOT}/evals/tools/ast/run-grade.sh" plugin-xml-config-to-php
