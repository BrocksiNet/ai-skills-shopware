#!/usr/bin/env bash
# Grader: di-tag-not-while-referenced
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
xml="$(find "$WORKDIR" -name 'services.xml' | head -n1 || true)"
php="$(grep -rl --include='*.php' 'LegacyCaller' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$xml" ] || [ -z "$php" ]; then
  echo "score=0 (services.xml or LegacyCaller.php not found)"
  exit 1
fi

has_service=0
has_deprecated=0
keeps_ref=0

grep -q 'swag.example.legacy_loader' "$xml" && has_service=1
grep -qE 'deprecated=' "$xml" && has_deprecated=1
if grep -q 'swag.example.legacy_loader' "$xml" && grep -q 'LegacyLoader' "$php"; then
  keeps_ref=1
fi

score=0
if [ "$has_service" -eq 1 ] && [ "$has_deprecated" -eq 0 ] && [ "$keeps_ref" -eq 1 ]; then
  score=1
fi

echo "score=$score (service=$has_service deprecated=$has_deprecated ref=$keeps_ref)"
[ "$score" -eq 1 ]
