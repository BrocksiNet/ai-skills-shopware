#!/usr/bin/env bash
# Grader: storefront-twig-block-snippet
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(find "$WORKDIR" -name 'buy-widget.html.twig' | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (buy-widget.html.twig not found)"
  exit 1
fi

has_extends=0
has_block=0
has_snippet=0
has_hardcoded=0
has_full_copy=0

grep -q "sw_extends '@Storefront/storefront/page/product-detail/buy-widget.html.twig'" "$file" && has_extends=1
grep -q 'page_product_detail_buy_button' "$file" && has_block=1
grep -q "swag-example.addToCart'|trans" "$file" && has_snippet=1
grep -qiE 'Add to cart' "$file" && has_hardcoded=1
if grep -q 'page_product_detail_buy_form' "$file" && grep -q 'page_product_detail_buy_quantity' "$file"; then
  has_full_copy=1
fi

score=0
if [ "$has_extends" -eq 1 ] && [ "$has_block" -eq 1 ] && [ "$has_snippet" -eq 1 ] && [ "$has_hardcoded" -eq 0 ] && [ "$has_full_copy" -eq 0 ]; then
  score=1
fi

echo "score=$score (extends=$has_extends block=$has_block snippet=$has_snippet hardcoded=$has_hardcoded full_copy=$has_full_copy)"
[ "$score" -eq 1 ]
