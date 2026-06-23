#!/usr/bin/env bash
# Grader: migration-timestamp-format
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'AddInternalNoteColumn' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (migration class not found)"
  exit 1
fi

class_name=""
timestamp=""
matched=0
placeholder=0

if [[ "$(basename "$file" .php)" =~ ^Migration([0-9]{10})AddInternalNoteColumn$ ]]; then
  timestamp="${BASH_REMATCH[1]}"
  class_name="Migration${timestamp}AddInternalNoteColumn"
fi

if [ -z "$timestamp" ]; then
  echo "score=0 (class name must be Migration<Timestamp>AddInternalNoteColumn)"
  exit 1
fi

case "$timestamp" in
  1234567890|1600000000|0000000000|1111111111|9999999999) placeholder=1 ;;
esac

if grep -qE "return[[:space:]]+${timestamp}[[:space:]]*;" "$file"; then
  matched=1
fi

score=0
if [ "$matched" -eq 1 ] && [ "$placeholder" -eq 0 ]; then
  score=1
fi

echo "score=$score (class=${class_name:-unknown} ts=${timestamp} matched=$matched placeholder=$placeholder)"
[ "$score" -eq 1 ]
