#!/usr/bin/env bash
# Grader: pr-no-ai-trailers
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(find "$WORKDIR" -name 'pr-body.md' | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (pr-body.md not found)"
  exit 1
fi

has_trailer=0
has_s1=0
has_s2=0
has_s3=0
has_s4=0
has_s5=0
keeps_text=0

if grep -qE 'Co-authored-by:|Co-committed-by:|Signed-off-by:' "$file"; then
  has_trailer=1
fi
grep -q '### 1. Why is this change necessary?' "$file" && has_s1=1
grep -q '### 2. What does this change do, exactly?' "$file" && has_s2=1
grep -q '### 3. Describe each step to reproduce the issue or behaviour.' "$file" && has_s3=1
grep -q '### 4. Please link to the relevant issues (if any).' "$file" && has_s4=1
grep -q '### 5. Checklist' "$file" && has_s5=1
grep -q 'CartProcessor' "$file" && keeps_text=1

score=0
if [ "$has_trailer" -eq 0 ] && [ "$has_s1" -eq 1 ] && [ "$has_s2" -eq 1 ] && [ "$has_s3" -eq 1 ] && [ "$has_s4" -eq 1 ] && [ "$has_s5" -eq 1 ] && [ "$keeps_text" -eq 1 ]; then
  score=1
fi

echo "score=$score (trailer=$has_trailer s1=$has_s1 s2=$has_s2 s3=$has_s3 s4=$has_s4 s5=$has_s5 text=$keeps_text)"
[ "$score" -eq 1 ]
