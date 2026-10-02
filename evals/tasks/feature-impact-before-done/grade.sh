#!/usr/bin/env bash
# Grader: feature-impact-before-done
# The subject is the review transcript, not a code edit.
set -euo pipefail

TRANSCRIPT="${TRANSCRIPT:?TRANSCRIPT not set}"

if [ ! -s "$TRANSCRIPT" ]; then
  echo "score=0 (empty transcript)"
  exit 1
fi

text="$(tr '[:upper:]' '[:lower:]' < "$TRANSCRIPT")"

cache=0
pays=0
complexity=0
hold=0
approves=0

if printf '%s' "$text" | grep -qE 'http cache|cache key|vary'; then
  cache=1
fi

if printf '%s' "$text" | grep -qE 'do not use analytics|does not use analytics|without analytics|never enable analytics|shops that do not'; then
  pays=1
fi

if printf '%s' "$text" | grep -qE 'more complex|easier'; then
  complexity=1
fi

if printf '%s' "$text" | grep -qE 'do not ship|narrow the design'; then
  hold=1
fi

# "do not ship" contains neither "ship it" nor a bare approval line.
if printf '%s' "$text" | grep -qE 'ship it|lgtm'; then
  approves=1
fi

score=0
if [ "$cache" -eq 1 ] && [ "$pays" -eq 1 ] && [ "$complexity" -eq 1 ] && [ "$hold" -eq 1 ] && [ "$approves" -eq 0 ]; then
  score=1
fi

echo "score=$score (cache=$cache pays=$pays complexity=$complexity hold=$hold approves=$approves)"
[ "$score" -eq 1 ]
