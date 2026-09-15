#!/usr/bin/env bash
# Grader: admin-jest-colocated-spec
set -euo pipefail

# shellcheck source=../../grade-helpers.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/grade-helpers.sh"

WORKDIR="${WORKDIR:?WORKDIR not set}"

has_source=0
has_colocated=0
has_tests_dir=0
oversized=0
has_case=0
has_assert=0
uses_subject=0

find "$WORKDIR" -name 'product-card.ts' | grep -q . && has_source=1
if find "$WORKDIR" -path '*/product-card.spec.ts' | grep -q .; then
  spec="$(find "$WORKDIR" -path '*/product-card.spec.ts' | head -n1)"
  dir="$(dirname "$spec")"
  if [[ -f "${dir}/product-card.ts" ]]; then
    has_colocated=1
  fi
  if [[ "$(wc -l < "$spec")" -ge 500 ]]; then
    oversized=1
  fi
  code="$(grade_without_comments "$spec")"
  printf '%s' "$code" | grep -qE '\b(describe|it|test)\s*\(' && has_case=1
  # Import the component and assert on it (not a tautology / comment token).
  if printf '%s' "$code" | grep -qE "import[[:space:]]+ProductCard[[:space:]]+from[[:space:]]+['\"]\\./product-card['\"]" \
    && printf '%s' "$code" | grep -qE 'expect\s*\(\s*ProductCard'; then
    has_assert=1
    uses_subject=1
  fi
fi
if find "$WORKDIR" -path '*/tests/*' -name '*.spec.ts' | grep -q .; then
  has_tests_dir=1
fi

score=0
if [ "$has_source" -eq 1 ] && [ "$has_colocated" -eq 1 ] && [ "$has_tests_dir" -eq 0 ] && [ "$oversized" -eq 0 ] && [ "$has_case" -eq 1 ] && [ "$has_assert" -eq 1 ] && [ "$uses_subject" -eq 1 ]; then
  score=1
fi

echo "score=$score (source=$has_source colocated=$has_colocated tests_dir=$has_tests_dir oversized=$oversized case=$has_case assert=$has_assert subject=$uses_subject)"
[ "$score" -eq 1 ]
