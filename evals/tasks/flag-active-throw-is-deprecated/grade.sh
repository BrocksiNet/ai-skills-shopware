#!/usr/bin/env bash
# Grader: flag-active-throw-is-deprecated
# The @deprecated tag must sit on the test method, not only the class.
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'function testThrowsWhenMajorActive' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (FlagThrowTest.php not found)"
  exit 1
fi

preamble="$(perl -0777 -ne 'print $1 if /final class[^{]*\{(.*?)function testThrowsWhenMajorActive/s' "$file")"
tag=0
reason=0

printf '%s\n' "$preamble" | grep -q '@deprecated tag:v6.9.0' && tag=1
printf '%s\n' "$preamble" | grep -qiE 'feature flag|removed with' && reason=1

score=0
if [ "$tag" -eq 1 ] && [ "$reason" -eq 1 ]; then
  score=1
fi

echo "score=$score (tag=$tag reason=$reason)"
[ "$score" -eq 1 ]
