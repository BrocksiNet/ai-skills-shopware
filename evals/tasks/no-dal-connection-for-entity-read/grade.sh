#!/usr/bin/env bash
# Grader: no-dal-connection-for-entity-read
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'OrderReader' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (OrderReader.php not found)"
  exit 1
fi

uses_connection=0
uses_repo=0

grep -qE 'Doctrine\\DBAL\\Connection|->fetchAllAssociative|->fetchAssociative' "$file" && uses_connection=1
grep -qE 'EntityRepository|->search\s*\(' "$file" && uses_repo=1

score=0
if [ "$uses_connection" -eq 0 ] && [ "$uses_repo" -eq 1 ]; then
  score=1
fi

echo "score=$score (connection=$uses_connection repo=$uses_repo)"
[ "$score" -eq 1 ]
