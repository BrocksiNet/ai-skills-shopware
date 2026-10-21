#!/usr/bin/env bash
# Grader: review-snippet-key-renamed-ignore (shopware-storefront, SF-012)
# The plugin adds a new snippet key and keeps every existing one. A minor+
# finding that names SF-012 or calls it a breaking change is a false
# positive.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" ignore \
  --rule SF-012 \
  --summary 'renam|remov|no longer exist|deprecat|breaks? (themes?|overrides?|translations?|templates?)|themes?\b[^.]{0,80}(break|overrid|translat)|backward.?compat|\bBC\b|breaking|old (snippet )?key|missing translation|untranslated'
