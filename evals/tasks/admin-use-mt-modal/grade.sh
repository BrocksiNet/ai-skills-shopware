#!/usr/bin/env bash
# Grader: admin-use-mt-modal
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.ts' --include='*.js' --include='*.vue' 'ProductDeleteModal\|product-delete-modal' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (product-delete-modal not found)"
  exit 1
fi

has_meteor=0
has_native=0

# Starting fixture has no local sw-modal; a newly introduced sw-modal is a bypass.
grep -qE 'mt-modal' "$file" && has_meteor=1
if grep -qE '<dialog|HTMLDialogElement|showModal\s*\(|popovertarget|\spopover=|\spopover[\s>]|showPopover\s*\(|togglePopover\s*\(' "$file"; then
  has_native=1
fi

score=0
if [ "$has_meteor" -eq 1 ] && [ "$has_native" -eq 0 ]; then
  score=1
fi

echo "score=$score (meteor=$has_meteor native=$has_native)"
[ "$score" -eq 1 ]
