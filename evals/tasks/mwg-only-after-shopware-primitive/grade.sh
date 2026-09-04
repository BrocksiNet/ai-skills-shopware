#!/usr/bin/env bash
# Grader: mwg-only-after-shopware-primitive
set -euo pipefail

# shellcheck source=../../grade-helpers.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/grade-helpers.sh"

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(find "$WORKDIR" -name 'product-card.html.twig' | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (product-card.html.twig not found)"
  exit 1
fi

has_bootstrap=0
has_native=0
has_mwg_skill=0

code="$(grade_without_comments "$file")"
if printf '%s' "$code" | grep -qE 'data-bs-toggle="modal"|data-bs-target='; then
  has_bootstrap=1
fi
if printf '%s' "$code" | grep -qE '<dialog|showModal\s*\(|popovertarget|\spopover='; then
  has_native=1
fi
if find "$WORKDIR" -iname '*modern-web-guidance*' -name 'SKILL.md' | grep -q .; then
  has_mwg_skill=1
fi

score=0
if [ "$has_bootstrap" -eq 1 ] && [ "$has_native" -eq 0 ] && [ "$has_mwg_skill" -eq 0 ]; then
  score=1
fi

echo "score=$score (bootstrap=$has_bootstrap native=$has_native mwg_skill=$has_mwg_skill)"
[ "$score" -eq 1 ]
