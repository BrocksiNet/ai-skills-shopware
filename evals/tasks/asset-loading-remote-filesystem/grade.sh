#!/usr/bin/env bash
# Grader: asset-loading-remote-filesystem
# The subject is the review transcript, not a code edit.
set -euo pipefail

TRANSCRIPT="${TRANSCRIPT:?TRANSCRIPT not set}"

if [ ! -s "$TRANSCRIPT" ]; then
  echo "score=0 (empty transcript)"
  exit 1
fi

text="$(tr '[:upper:]' '[:lower:]' < "$TRANSCRIPT")"

remote=0
local_disk=0
hold=0
approves=0

if printf '%s' "$text" | grep -qE 's3|remote filesystem|object storage'; then
  remote=1
fi

if printf '%s' "$text" | grep -qE 'local'; then
  local_disk=1
fi

if printf '%s' "$text" | grep -qE 'do not ship|narrow the design'; then
  hold=1
fi

if printf '%s' "$text" | grep -qE 'ship it|lgtm'; then
  approves=1
fi

score=0
if [ "$remote" -eq 1 ] && [ "$local_disk" -eq 1 ] && [ "$hold" -eq 1 ] && [ "$approves" -eq 0 ]; then
  score=1
fi

echo "score=$score (remote=$remote local=$local_disk hold=$hold approves=$approves)"
[ "$score" -eq 1 ]
