#!/usr/bin/env bash
# Grader: store-api-route-extension-event
set -euo pipefail

# shellcheck source=../../grade-helpers.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/grade-helpers.sh"

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'class ProductBadgeRoute' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (ProductBadgeRoute.php not found)"
  exit 1
fi

body="$(grade_without_comments "$file")"
abstract=0
extension=0

printf '%s\n' "$body" | grep -q 'abstract class' && abstract=1
printf '%s\n' "$body" | grep -q 'ExtensionDispatcher' && extension=1

score=0
if [ "$abstract" -eq 0 ] && [ "$extension" -eq 1 ]; then
  score=1
fi

echo "score=$score (abstract=$abstract extension=$extension)"
[ "$score" -eq 1 ]
