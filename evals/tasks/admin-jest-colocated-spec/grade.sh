#!/usr/bin/env bash
# Grader: admin-jest-colocated-spec
set -euo pipefail

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
  grep -qE '\b(describe|it|test)\s*\(' "$spec" && has_case=1
  grep -qE '\bexpect\s*\(' "$spec" && has_assert=1
  grep -qE 'ProductCard|product-card' "$spec" && uses_subject=1
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
