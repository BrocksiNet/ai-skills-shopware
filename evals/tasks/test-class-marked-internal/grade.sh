#!/usr/bin/env bash
# Grader: test-class-marked-internal
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'CartNormalizerTest' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (CartNormalizerTest.php not found)"
  exit 1
fi

has_internal=0
has_package=0
has_covers=0

flat="$(tr '\n' ' ' < "$file")"
if printf '%s' "$flat" | grep -qE '/\*\*.*@internal.*\*/[[:space:]]*(#\[[^]]+\][[:space:]]*)*final class CartNormalizerTest'; then
  has_internal=1
fi
grep -qE "#\[Package\(['\"]checkout\.cart['\"]\)\]" "$file" && has_package=1
grep -q '#\[CoversClass(CartNormalizer::class)\]' "$file" && has_covers=1

score=0
if [ "$has_internal" -eq 1 ] && [ "$has_package" -eq 1 ] && [ "$has_covers" -eq 1 ]; then
  score=1
fi

echo "score=$score (internal=$has_internal package=$has_package covers=$has_covers)"
[ "$score" -eq 1 ]
