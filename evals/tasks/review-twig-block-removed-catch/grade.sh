#!/usr/bin/env bash
# Grader: review-twig-block-removed-catch (shopware-storefront, SF-001)
# The plugin template renames block swag_loyalty_badge_label to
# swag_loyalty_badge_text and drops the old name, so theme overrides of the
# old block silently stop rendering. Needs a major+ finding in the views
# that names SF-001 or describes the rename without deprecation.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" catch \
  --rule SF-001 --file 'src/Resources/views/**' --min-severity major \
  --summary 'renam|remov|no longer exist|deprecat|breaks? (themes?|overrides?|extensions?)|themes?\b[^.]{0,60}(break|overrid|extend)|backward.?compat|\bBC\b|breaking'
