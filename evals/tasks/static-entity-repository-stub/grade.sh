#!/usr/bin/env bash
# Grader: static-entity-repository-stub
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'ProductLoaderTest' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (ProductLoaderTest.php not found)"
  exit 1
fi

has_stub=0
has_of=0
has_mock=0
keeps_assert=0

grep -q 'StaticEntityRepository' "$file" && has_stub=1
grep -qE 'StaticEntityRepository::of\s*\(\s*ProductCollection::class' "$file" && has_of=1
if grep -qE 'createMock\s*\(\s*EntityRepository' "$file"; then
  has_mock=1
fi
grep -q 'swag-example-product' "$file" && keeps_assert=1

score=0
if [ "$has_stub" -eq 1 ] && [ "$has_of" -eq 1 ] && [ "$has_mock" -eq 0 ] && [ "$keeps_assert" -eq 1 ]; then
  score=1
fi

echo "score=$score (stub=$has_stub of=$has_of mock=$has_mock assert=$keeps_assert)"
[ "$score" -eq 1 ]
