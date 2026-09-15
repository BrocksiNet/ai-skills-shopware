#!/usr/bin/env bash
# Grader: storefront-media-thumbnails
set -euo pipefail

# shellcheck source=../../grade-helpers.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/grade-helpers.sh"

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(find "$WORKDIR" -name 'product-box.html.twig' | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (product-box.html.twig not found)"
  exit 1
fi

has_thumbnails=0
has_media_srcset=0
has_cdn=0

code="$(grade_without_comments "$file")"
printf '%s' "$code" | grep -qE 'sw_thumbnails' && has_thumbnails=1
if printf '%s' "$code" | grep -qE 'cover\.media' && printf '%s' "$code" | grep -qiE 'srcset'; then
  has_media_srcset=1
fi
printf '%s' "$code" | grep -qE 'https://cdn\.example/product\.jpg' && has_cdn=1

score=0
if { [ "$has_thumbnails" -eq 1 ] || [ "$has_media_srcset" -eq 1 ]; } && [ "$has_cdn" -eq 0 ]; then
  score=1
fi

echo "score=$score (thumbnails=$has_thumbnails media_srcset=$has_media_srcset cdn=$has_cdn)"
[ "$score" -eq 1 ]
