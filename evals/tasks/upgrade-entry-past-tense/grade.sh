#!/usr/bin/env bash
# Grader: upgrade-entry-past-tense
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(find "$WORKDIR" -name 'UPGRADE-6.8.md' | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (UPGRADE-6.8.md not found)"
  exit 1
fi

version_headings=0
has_subject=0
has_past=0
has_future=0

version_headings="$(grep -cE '^# 6\.8\.0\.0' "$file" || true)"
grep -q 'CartProcessor' "$file" && has_subject=1

section="$(awk '
    /^## / && /CartProcessor/ { p=1; print; next }
    /^## / { p=0 }
    p { print }
' "$file")"

printf '%s' "$section" | grep -qiE '\b(was|were|removed)\b' && has_past=1
if printf '%s' "$section" | grep -qiE '\b(will|going to|must be removed)\b'; then
  has_future=1
fi

score=0
if [ "$version_headings" -eq 1 ] && [ "$has_subject" -eq 1 ] && [ "$has_past" -eq 1 ] && [ "$has_future" -eq 0 ]; then
  score=1
fi

echo "score=$score (versions=$version_headings subject=$has_subject past=$has_past future=$has_future)"
[ "$score" -eq 1 ]
