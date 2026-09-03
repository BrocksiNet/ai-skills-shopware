#!/usr/bin/env bash
# Grader: admin-js-implementation-to-ts
set -euo pipefail

# shellcheck source=../../grade-helpers.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/grade-helpers.sh"

WORKDIR="${WORKDIR:?WORKDIR not set}"

has_impl_ts=0
has_impl_js=0
has_main_js=0
has_main_ts=0
has_export=0
main_imports=0

impl_ts="$(find "$WORKDIR" -path '*/product-card.ts' | head -n1 || true)"
impl_js="$(find "$WORKDIR" -path '*/product-card.js' | head -n1 || true)"
main_js="$(find "$WORKDIR" -path '*/administration/src/main.js' | head -n1 || true)"
main_ts="$(find "$WORKDIR" -path '*/administration/src/main.ts' | head -n1 || true)"

if [[ -n "$impl_ts" ]]; then
  has_impl_ts=1
  code="$(grade_without_comments "$impl_ts")"
  if printf '%s' "$code" | grep -qE 'export[[:space:]]+default' \
    && printf '%s' "$code" | grep -qE 'swag-example-product-card'; then
    has_export=1
  fi
fi
[[ -n "$impl_js" ]] && has_impl_js=1
if [[ -n "$main_js" ]]; then
  has_main_js=1
  main_code="$(grade_without_comments "$main_js")"
  if printf '%s' "$main_code" | grep -qE "import[[:space:]]+['\"][^'\"]*product-card['\"]"; then
    main_imports=1
  fi
fi
[[ -n "$main_ts" ]] && has_main_ts=1

score=0
if [ "$has_impl_ts" -eq 1 ] && [ "$has_impl_js" -eq 0 ] && [ "$has_main_js" -eq 1 ] && [ "$has_main_ts" -eq 0 ] && [ "$has_export" -eq 1 ] && [ "$main_imports" -eq 1 ]; then
  score=1
fi

echo "score=$score (impl_ts=$has_impl_ts impl_js=$has_impl_js main_js=$has_main_js main_ts=$has_main_ts export=$has_export import=$main_imports)"
[ "$score" -eq 1 ]
