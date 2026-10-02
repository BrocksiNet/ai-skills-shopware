#!/usr/bin/env bash
# Grader: prepare-plugin-for-6-8
# The subject is the review transcript, not a code edit.
set -euo pipefail

TRANSCRIPT="${TRANSCRIPT:?TRANSCRIPT not set}"

if [ ! -s "$TRANSCRIPT" ]; then
  echo "score=0 (empty transcript)"
  exit 1
fi

text="$(tr '[:upper:]' '[:lower:]' < "$TRANSCRIPT")"

flag=0
range=0
behaviors=0
wrong=0

if printf '%s' "$text" | grep -q 'v6_8_0_0'; then
  flag=1
fi

if printf '%s' "$text" | grep -qE 'do not narrow|~6\.6|6\.6 and 6\.7|without dropping'; then
  range=1
fi

if printf '%s' "$text" | grep -qE 'cache'; then
  behaviors=$((behaviors + 1))
fi
if printf '%s' "$text" | grep -qE 'cent|discount|split quantit'; then
  behaviors=$((behaviors + 1))
fi
if printf '%s' "$text" | grep -q 'document'; then
  behaviors=$((behaviors + 1))
fi
if printf '%s' "$text" | grep -q 'flow'; then
  behaviors=$((behaviors + 1))
fi

if printf '%s' "$text" | grep -qE 'feature_all=1|~6\.8\.0 only|6\.8\.0 only'; then
  wrong=1
fi

score=0
if [ "$flag" -eq 1 ] && [ "$range" -eq 1 ] && [ "$behaviors" -ge 2 ] && [ "$wrong" -eq 0 ]; then
  score=1
fi

echo "score=$score (flag=$flag range=$range behaviors=$behaviors wrong=$wrong)"
[ "$score" -eq 1 ]
