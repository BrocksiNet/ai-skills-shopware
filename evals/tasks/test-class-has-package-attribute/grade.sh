#!/usr/bin/env bash
# Grader: test-class-has-package-attribute
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'CartNormalizerTest' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (CartNormalizerTest.php not found)"
  exit 1
fi

has_package_attr=0
has_package_import=0
has_covers=0

grep -qE "#\[Package\(['\"]checkout\.cart['\"]\)\]" "$file" && has_package_attr=1
grep -q 'use Shopware\\Core\\Framework\\Log\\Package' "$file" && has_package_import=1
grep -q '#\[CoversClass(CartNormalizer::class)\]' "$file" && has_covers=1

score=0
if [ "$has_package_attr" -eq 1 ] && [ "$has_package_import" -eq 1 ] && [ "$has_covers" -eq 1 ]; then
  score=1
fi

echo "score=$score (package_attr=$has_package_attr package_import=$has_package_import covers=$has_covers)"
[ "$score" -eq 1 ]
