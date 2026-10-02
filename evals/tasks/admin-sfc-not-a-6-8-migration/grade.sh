#!/usr/bin/env bash
# Grader: admin-sfc-not-a-6-8-migration
# The subject is the review transcript, not a code edit.
set -euo pipefail

TRANSCRIPT="${TRANSCRIPT:?TRANSCRIPT not set}"

if [ ! -s "$TRANSCRIPT" ]; then
  echo "score=0 (empty transcript)"
  exit 1
fi

text="$(tr '[:upper:]' '[:lower:]' < "$TRANSCRIPT")"

experimental=0
keep_twig=0
not_required=0
rewrites=0

if printf '%s' "$text" | grep -qE 'experimental|discussion|preview'; then
  experimental=1
fi

if printf '%s' "$text" | grep -q 'twig'; then
  keep_twig=1
fi

if printf '%s' "$text" | grep -qE 'not required|not the upgrade|do not rewrite|still works'; then
  not_required=1
fi

if printf '%s' "$text" | grep -qE '6\.8 requires|swdefineoverride\(\{'; then
  rewrites=1
fi

score=0
if [ "$experimental" -eq 1 ] && [ "$keep_twig" -eq 1 ] && [ "$not_required" -eq 1 ] && [ "$rewrites" -eq 0 ]; then
  score=1
fi

echo "score=$score (experimental=$experimental keep_twig=$keep_twig not_required=$not_required rewrites=$rewrites)"
[ "$score" -eq 1 ]
