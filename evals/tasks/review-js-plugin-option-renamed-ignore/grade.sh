#!/usr/bin/env bash
# Grader: review-js-plugin-option-renamed-ignore (shopware-storefront, SF-011)
# The plugin adds an animate option with a default and keeps every existing
# option and event. A minor+ finding that names SF-011 or calls it a
# breaking change for themes is a false positive.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" ignore \
  --rule SF-011 \
  --summary 'renam|remov|no longer (read|emit|publish|support)|deprecat|breaks? (themes?|overrides?|extensions?|listeners?|subscribers?)|themes?\b[^.]{0,80}(break|overrid|options?|attribute)|backward.?compat|\bBC\b|breaking|old (option|event|name)'
