#!/usr/bin/env bash
# Grader: storefront-no-blocking-nostore-ajax
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"

has_plugin=0
has_fetch=0
has_document_nostore=0

grep -rqE --include='*.js' 'extends Plugin' "$WORKDIR" && has_plugin=1
grep -rqE --include='*.js' 'fetch\s*\(' "$WORKDIR" && has_fetch=1
if grep -rqE --include='*.php' --include='*.twig' --include='*.html' 'Cache-Control' "$WORKDIR" \
  && grep -rqE --include='*.php' --include='*.twig' --include='*.html' 'no-store' "$WORKDIR"; then
  has_document_nostore=1
fi
if grep -rqE --include='*.php' "headers->set\s*\(\s*['\"]Cache-Control['\"]\s*,\s*['\"][^'\"]*no-store" "$WORKDIR"; then
  has_document_nostore=1
fi

score=0
if [ "$has_plugin" -eq 1 ] && [ "$has_fetch" -eq 1 ] && [ "$has_document_nostore" -eq 0 ]; then
  score=1
fi

echo "score=$score (plugin=$has_plugin fetch=$has_fetch document_nostore=$has_document_nostore)"
[ "$score" -eq 1 ]
