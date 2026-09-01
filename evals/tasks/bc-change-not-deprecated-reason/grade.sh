#!/usr/bin/env bash
# Grader: bc-change-not-deprecated-reason
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'LegacyIdLoader' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (LegacyIdLoader.php not found)"
  exit 1
fi

has_attr=0
has_import=0
has_reason=0
keeps_union=0

grep -qE '#\[ParameterTypeNarrowing\(' "$file" && has_attr=1
grep -q 'use Shopware\\Core\\Framework\\Deprecation\\BCChange\\ParameterTypeNarrowing' "$file" && has_import=1
grep -qE '@deprecated[[:space:]]+reason:' "$file" && has_reason=1
grep -qE 'string\|int\s+\$id' "$file" && keeps_union=1

score=0
if [ "$has_attr" -eq 1 ] && [ "$has_import" -eq 1 ] && [ "$has_reason" -eq 0 ] && [ "$keeps_union" -eq 1 ]; then
  score=1
fi

echo "score=$score (attr=$has_attr import=$has_import reason=$has_reason union=$keeps_union)"
[ "$score" -eq 1 ]
