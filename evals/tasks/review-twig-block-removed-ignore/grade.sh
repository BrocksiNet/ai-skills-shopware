#!/usr/bin/env bash
# Grader: review-twig-block-removed-ignore (shopware-storefront, SF-001)
# The change adds an inner block and keeps every existing block name. A
# minor+ finding that names SF-001 or calls it a breaking change for themes
# is a false positive.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" ignore \
  --rule SF-001 \
  --summary 'renam|remov|no longer exist|deprecat|breaks? (themes?|overrides?|extensions?)|themes?\b[^.]{0,60}(break|overrid|extend)|backward.?compat|\bBC\b|breaking'
