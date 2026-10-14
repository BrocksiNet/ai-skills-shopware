#!/usr/bin/env bash
# Grader: support-reply-single-block (shopware-assistant-style)
# The reply must be one outer fenced block (copy-ready), with no nested fences,
# no em dashes, no AI filler, and it must name the cache as the cause.
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$WORKDIR/reply.md"

if [ ! -s "$file" ]; then
  echo "score=0 (reply.md missing or empty)"
  exit 1
fi

# Fence lines (``` or ~~~), ignoring blank lines around the block.
fences="$(grep -cE '^[[:space:]]*(```|~~~)' "$file" || true)"
first="$(grep -vE '^[[:space:]]*$' "$file" | head -n1)"
last="$(grep -vE '^[[:space:]]*$' "$file" | tail -n1)"

single_block=0
if [ "$fences" -eq 2 ] && printf '%s' "$first" | grep -qE '^(```|~~~)' && printf '%s\n' "$last" | grep -qE '^(```|~~~)[[:space:]]*$'; then
  single_block=1
fi

em_dash=0
grep -q '—' "$file" && em_dash=1

filler=0
grep -qiE "great question|i hope this helps|happy to help|feel free to reach out|don't hesitate|certainly!|absolutely!|delve" "$file" && filler=1

names_cache=0
grep -qiE 'cache' "$file" && names_cache=1

score=0
if [ "$single_block" -eq 1 ] && [ "$em_dash" -eq 0 ] && [ "$filler" -eq 0 ] && [ "$names_cache" -eq 1 ]; then
  score=1
fi

echo "score=$score (single_block=$single_block fences=$fences em_dash=$em_dash filler=$filler cache=$names_cache)"
[ "$score" -eq 1 ]
