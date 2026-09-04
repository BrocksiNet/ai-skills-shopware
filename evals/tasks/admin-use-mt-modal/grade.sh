#!/usr/bin/env bash
# Grader: admin-use-mt-modal
set -euo pipefail

# shellcheck source=../../grade-helpers.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/grade-helpers.sh"

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.ts' --include='*.js' --include='*.vue' 'ProductDeleteModal\|product-delete-modal' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (product-delete-modal not found)"
  exit 1
fi

has_meteor=0
has_native=0

code="$(grade_without_comments "$file")"
# Starting fixture has no local sw-modal; require the Meteor tag in markup.
printf '%s' "$code" | grep -qE '<mt-modal[[:space:]/>]' && has_meteor=1
if printf '%s' "$code" | grep -qE '<dialog|HTMLDialogElement|showModal\s*\(|popovertarget|\spopover=|\spopover[\s>]|showPopover\s*\(|togglePopover\s*\('; then
  has_native=1
fi

score=0
if [ "$has_meteor" -eq 1 ] && [ "$has_native" -eq 0 ]; then
  score=1
fi

echo "score=$score (meteor=$has_meteor native=$has_native)"
[ "$score" -eq 1 ]
