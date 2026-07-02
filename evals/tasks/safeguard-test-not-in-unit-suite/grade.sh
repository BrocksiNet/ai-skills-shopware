#!/usr/bin/env bash
# Grader: safeguard-test-not-in-unit-suite
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"

unit_file=""
devops_file=""

if [ -f "${WORKDIR}/tests/unit/Core/Framework/Mcp/McpDiscoveryScanDirsConfigTest.php" ]; then
  unit_file="${WORKDIR}/tests/unit/Core/Framework/Mcp/McpDiscoveryScanDirsConfigTest.php"
fi

if [ -f "${WORKDIR}/tests/devops/Core/Framework/Mcp/McpDiscoveryScanDirsConfigTest.php" ]; then
  devops_file="${WORKDIR}/tests/devops/Core/Framework/Mcp/McpDiscoveryScanDirsConfigTest.php"
fi

score=0
if [ -z "$unit_file" ] && [ -n "$devops_file" ] && grep -q 'CoversNothing' "$devops_file"; then
  score=1
fi

echo "score=$score (unit_present=$([ -n "$unit_file" ] && echo 1 || echo 0) devops_present=$([ -n "$devops_file" ] && echo 1 || echo 0))"
[ "$score" -eq 1 ]
