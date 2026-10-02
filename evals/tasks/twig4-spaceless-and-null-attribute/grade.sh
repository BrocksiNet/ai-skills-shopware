#!/usr/bin/env bash
# Grader: twig4-spaceless-and-null-attribute
# The subject is the review transcript, not a code edit.
set -euo pipefail

TRANSCRIPT="${TRANSCRIPT:?TRANSCRIPT not set}"

if [ ! -s "$TRANSCRIPT" ]; then
  echo "score=0 (empty transcript)"
  exit 1
fi

text="$(tr '[:upper:]' '[:lower:]' < "$TRANSCRIPT")"

spaceless=0
null_attr=0
macro_default=0
wrong=0

if printf '%s' "$text" | grep -qE 'remove the spaceless|spaceless filter is gone|do not use spaceless|without the spaceless'; then
  spaceless=1
fi

if printf '%s' "$text" | grep -qE 'null' && printf '%s' "$text" | grep -qE 'attributes\.remove|omit the attribute|omit it'; then
  null_attr=1
fi

if printf '%s' "$text" | grep -qE 'default'; then
  macro_default=1
fi

if printf '%s' "$text" | grep -qE 'apply spaceless|spaceless still'; then
  wrong=1
fi

score=0
if [ "$spaceless" -eq 1 ] && [ "$null_attr" -eq 1 ] && [ "$macro_default" -eq 1 ] && [ "$wrong" -eq 0 ]; then
  score=1
fi

echo "score=$score (spaceless=$spaceless null_attr=$null_attr macro_default=$macro_default wrong=$wrong)"
[ "$score" -eq 1 ]
