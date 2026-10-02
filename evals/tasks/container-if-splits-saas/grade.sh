#!/usr/bin/env bash
# Grader: container-if-splits-saas
# The subject is the review transcript, not a code edit.
set -euo pipefail

TRANSCRIPT="${TRANSCRIPT:?TRANSCRIPT not set}"

if [ ! -s "$TRANSCRIPT" ]; then
  echo "score=0 (empty transcript)"
  exit 1
fi

text="$(tr '[:upper:]' '[:lower:]' < "$TRANSCRIPT")"

one=0
flag=0
split=0
hold=0
approves=0

if printf '%s' "$text" | grep -qE 'one container|single container|unified container'; then
  one=1
fi

if printf '%s' "$text" | grep -qE 'feature flag'; then
  flag=1
fi

if printf '%s' "$text" | grep -qE 'compil|different container|splits the container|per feature flag'; then
  split=1
fi

if printf '%s' "$text" | grep -qE 'do not ship|narrow the design'; then
  hold=1
fi

if printf '%s' "$text" | grep -qE 'ship it|lgtm'; then
  approves=1
fi

score=0
if [ "$one" -eq 1 ] && [ "$flag" -eq 1 ] && [ "$split" -eq 1 ] && [ "$hold" -eq 1 ] && [ "$approves" -eq 0 ]; then
  score=1
fi

echo "score=$score (one=$one flag=$flag split=$split hold=$hold approves=$approves)"
[ "$score" -eq 1 ]
