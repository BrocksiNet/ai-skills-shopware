#!/usr/bin/env bash
# Grader: static-entity-repository-stub
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'ProductLoaderTest' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (ProductLoaderTest.php not found)"
  exit 1
fi

has_wired=0
has_double=0
keeps_assert=0

flat="$(tr '\n' ' ' < "$file")"
# $repo = StaticEntityRepository::of(...); new ProductLoader($repo)
if printf '%s' "$flat" | grep -qE '\$([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=[[:space:]]*StaticEntityRepository::of\s*\(\s*ProductCollection::class.*new ProductLoader\s*\(\s*\$\1'; then
  has_wired=1
fi
# new ProductLoader(StaticEntityRepository::of(...))
if printf '%s' "$flat" | grep -qE 'new ProductLoader\s*\(\s*StaticEntityRepository::of\s*\(\s*ProductCollection::class'; then
  has_wired=1
fi
if grep -qE 'createMock\s*\(|createStub\s*\(|getMockBuilder\s*\(' "$file"; then
  has_double=1
fi
grep -qE "assertSame\s*\(\s*'swag-example-product-a'" "$file" && keeps_assert=1

score=0
if [ "$has_wired" -eq 1 ] && [ "$has_double" -eq 0 ] && [ "$keeps_assert" -eq 1 ]; then
  score=1
fi

echo "score=$score (wired=$has_wired double=$has_double assert=$keeps_assert)"
[ "$score" -eq 1 ]
