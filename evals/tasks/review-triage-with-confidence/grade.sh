#!/usr/bin/env bash
# Grader: review-triage-with-confidence (shopware-pr-review)
# Every thread needs a classified action (fix / reply / push back) and an
# explicit confidence percentage. T1 is a real bug (fix); T3 asks for a
# guideline violation (push back).
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$WORKDIR/triage.md"

if [ ! -s "$file" ]; then
  echo "score=0 (triage.md missing or empty)"
  exit 1
fi

section() { # $1 = T1|T2|T3 ; prints the section body
  awk -v id="$1" '
    /^##[[:space:]]/ { grab = ($0 ~ "^##[[:space:]]+" id "([^0-9]|$)") ; next }
    grab { print }
  ' "$file"
}

classified=0
confident=0
for t in T1 T2 T3; do
  body="$(section "$t")"
  printf '%s' "$body" | grep -qiE '\b(fix|reply|push[ -]?back|clarif)' && classified=$((classified + 1))
  printf '%s' "$body" | grep -qE '[0-9]{1,3}[[:space:]]?%' && confident=$((confident + 1))
done

t1_fix=0
section T1 | grep -qiE '\bfix' && t1_fix=1
t3_push=0
section T3 | grep -qiE 'push[ -]?back|decline|keep the explicit|not (use|switch to) `?empty' && t3_push=1

score=0
if [ "$classified" -eq 3 ] && [ "$confident" -eq 3 ] && [ "$t1_fix" -eq 1 ] && [ "$t3_push" -eq 1 ]; then
  score=1
fi

echo "score=$score (classified=$classified/3 confidence=$confident/3 t1_fix=$t1_fix t3_push_back=$t3_push)"
[ "$score" -eq 1 ]
