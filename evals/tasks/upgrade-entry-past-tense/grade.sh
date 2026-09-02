#!/usr/bin/env bash
# Grader: upgrade-entry-past-tense
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(find "$WORKDIR" -name 'UPGRADE-6.8.md' | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (UPGRADE-6.8.md not found)"
  exit 1
fi

has_heading=0
has_subject=0
has_past=0
has_future=0

grep -qE '^# 6\.8\.0\.0' "$file" && has_heading=1
grep -q 'CartProcessor' "$file" && has_subject=1
grep -qiE '\b(was|were|removed)\b' "$file" && has_past=1
if grep -qiE '\b(will|going to|must be removed)\b' "$file"; then
  has_future=1
fi

score=0
if [ "$has_heading" -eq 1 ] && [ "$has_subject" -eq 1 ] && [ "$has_past" -eq 1 ] && [ "$has_future" -eq 0 ]; then
  score=1
fi

echo "score=$score (heading=$has_heading subject=$has_subject past=$has_past future=$has_future)"
[ "$score" -eq 1 ]
