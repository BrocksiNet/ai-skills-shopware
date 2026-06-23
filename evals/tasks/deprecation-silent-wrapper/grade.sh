#!/usr/bin/env bash
# Grader: deprecation-silent-wrapper
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'LegacyConfigReader' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (LegacyConfigReader.php not found)"
  exit 1
fi

uses_silent=0
uses_legacy=0
bare_legacy=0

grep -qE 'Feature::silent\s*\(' "$file" && uses_silent=1
grep -qE 'DeprecatedConfigLoader::loadLegacy\s*\(' "$file" && uses_legacy=1
if grep -qE 'return\s+DeprecatedConfigLoader::loadLegacy\s*\(' "$file"; then
  bare_legacy=1
fi

score=0
if [ "$uses_silent" -eq 1 ] && [ "$uses_legacy" -eq 1 ] && [ "$bare_legacy" -eq 0 ]; then
  score=1
fi

echo "score=$score (silent=$uses_silent legacy=$uses_legacy bare_call=$bare_legacy)"
[ "$score" -eq 1 ]
