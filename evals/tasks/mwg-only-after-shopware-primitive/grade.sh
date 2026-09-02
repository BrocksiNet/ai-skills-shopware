#!/usr/bin/env bash
# Grader: mwg-only-after-shopware-primitive
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(find "$WORKDIR" -name 'product-card.html.twig' | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (product-card.html.twig not found)"
  exit 1
fi

has_bootstrap=0
has_native=0
has_mwg_skill=0

if grep -qE 'data-bs-toggle="modal"|js-modal|modal fade' "$file"; then
  has_bootstrap=1
fi
if grep -qE '<dialog|showModal\s*\(|popovertarget|\spopover=' "$file"; then
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
