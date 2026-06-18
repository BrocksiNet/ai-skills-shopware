#!/usr/bin/env bash
# Grader: interface-di-repository
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'ProductReader' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (ProductReader.php not found)"
  exit 1
fi

uses_interface=0
uses_concrete_repo=0

if grep -qE 'ProductRepositoryInterface|EntityRepositoryInterface' "$file"; then
  uses_interface=1
fi

if grep -qE 'EntityRepository' "$file" && [ "$uses_interface" -eq 0 ]; then
  uses_concrete_repo=1
fi

score=0
if [ "$uses_interface" -eq 1 ] && [ "$uses_concrete_repo" -eq 0 ]; then
  score=1
fi

echo "score=$score (interface=$uses_interface concrete_entity_repository=$uses_concrete_repo)"
[ "$score" -eq 1 ]
