#!/usr/bin/env bash
# Grader: no-speculation-on-checkout
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.twig' 'page_checkout_confirm\|checkout/confirm' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (checkout twig not found)"
  exit 1
fi

has_spec=0
has_prefetch=0
keeps_extends=0
keeps_parent=0
keeps_block=0

grep -qiE 'speculationrules|prerender|type="speculation' "$file" && has_spec=1
if grep -qiE 'prefetch|href_matches' "$file"; then
  has_prefetch=1
fi
grep -q "sw_extends '@Storefront/storefront/page/checkout/confirm.html.twig'" "$file" && keeps_extends=1
grep -q '{{ parent() }}' "$file" && keeps_parent=1
grep -q 'page_checkout_confirm' "$file" && keeps_block=1

score=0
if [ "$has_spec" -eq 0 ] && [ "$has_prefetch" -eq 0 ] && [ "$keeps_extends" -eq 1 ] && [ "$keeps_parent" -eq 1 ] && [ "$keeps_block" -eq 1 ]; then
  score=1
fi

echo "score=$score (speculation=$has_spec prefetch=$has_prefetch extends=$keeps_extends parent=$keeps_parent block=$keeps_block)"
[ "$score" -eq 1 ]
