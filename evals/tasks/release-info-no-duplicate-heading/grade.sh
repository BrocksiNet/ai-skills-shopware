#!/usr/bin/env bash
# Grader: release-info-no-duplicate-heading
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(find "$WORKDIR" -name 'RELEASE_INFO-6.7.md' | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (RELEASE_INFO-6.7.md not found)"
  exit 1
fi

version_headings=0
feature_headings=0
has_existing=0
has_new_in_features=0

version_headings="$(grep -cE '^# 6\.7\.4\.0[[:space:]]*$' "$file" || true)"
feature_headings="$(grep -cE '^## Features[[:space:]]*$' "$file" || true)"
grep -q 'ProductRoute' "$file" && has_existing=1

if awk '
    /^# 6\.7\.4\.0[[:space:]]*$/ { v=1; next }
    /^# / { v=0 }
    v && /^## Features[[:space:]]*$/ { f=1; next }
    v && /^## / { f=0 }
    v && f && /CartProcessor/ { found=1 }
    END { exit found ? 0 : 1 }
' "$file"; then
  has_new_in_features=1
fi

score=0
if [ "$version_headings" -eq 1 ] && [ "$feature_headings" -eq 1 ] && [ "$has_existing" -eq 1 ] && [ "$has_new_in_features" -eq 1 ]; then
  score=1
fi

echo "score=$score (versions=$version_headings features=$feature_headings existing=$has_existing in_features=$has_new_in_features)"
[ "$score" -eq 1 ]
