#!/usr/bin/env bash
# Grader: no-speculation-on-checkout
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.twig' 'checkout' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (checkout twig not found)"
  exit 1
fi

has_spec=0
keeps_block=0

grep -qiE 'speculationrules|prerender|type="speculation' "$file" && has_spec=1
grep -q 'page_checkout_confirm' "$file" && keeps_block=1

score=0
if [ "$has_spec" -eq 0 ] && [ "$keeps_block" -eq 1 ]; then
  score=1
fi

echo "score=$score (speculation=$has_spec keeps_block=$keeps_block)"
[ "$score" -eq 1 ]
