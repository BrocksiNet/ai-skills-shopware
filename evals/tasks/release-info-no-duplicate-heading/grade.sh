#!/usr/bin/env bash
# Grader: release-info-no-duplicate-heading
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(find "$WORKDIR" -name 'RELEASE_INFO-6.7.md' | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (RELEASE_INFO-6.7.md not found)"
  exit 1
fi

has_version=0
feature_headings=0
has_existing=0
has_new=0

grep -qE '^# 6\.7\.4\.0[[:space:]]*$' "$file" && has_version=1
feature_headings="$(grep -cE '^## Features[[:space:]]*$' "$file" || true)"
grep -q 'ProductRoute' "$file" && has_existing=1
grep -q 'CartProcessor' "$file" && has_new=1

score=0
if [ "$has_version" -eq 1 ] && [ "$feature_headings" -eq 1 ] && [ "$has_existing" -eq 1 ] && [ "$has_new" -eq 1 ]; then
  score=1
fi

echo "score=$score (version=$has_version features=$feature_headings existing=$has_existing new=$has_new)"
[ "$score" -eq 1 ]
