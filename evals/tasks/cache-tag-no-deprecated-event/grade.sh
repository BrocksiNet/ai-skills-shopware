#!/usr/bin/env bash
# Grader: cache-tag-no-deprecated-event
# PASS when the resulting code uses CacheTagCollector::addTag and no longer
# references the deprecated *CacheTagsEvent.
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"

php_files="$(grep -rl --include='*.php' . "$WORKDIR" 2>/dev/null || true)"

uses_collector=0
uses_deprecated=0

if grep -rqE 'CacheTagCollector' "$WORKDIR" 2>/dev/null && \
   grep -rqE 'addTag\(' "$WORKDIR" 2>/dev/null; then
  uses_collector=1
fi

if grep -rqE 'CacheTagsEvent' "$WORKDIR" 2>/dev/null; then
  uses_deprecated=1
fi

score=0
if [ "$uses_collector" -eq 1 ] && [ "$uses_deprecated" -eq 0 ]; then
  score=1
fi

echo "score=$score (collector=$uses_collector deprecated=$uses_deprecated)"
[ "$score" -eq 1 ]
