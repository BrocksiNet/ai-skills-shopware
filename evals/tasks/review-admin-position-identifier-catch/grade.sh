#!/usr/bin/env bash
# Grader: review-admin-position-identifier-catch (shopware-admin-js, ADM-040)
# The released detail page renames the swag-loyalty-detail-sidebar position
# identifier and its blocks-list.json entry. Apps and plugins that render
# into the old identifier silently disappear. Needs a major+ finding in the
# Administration sources that names ADM-040 or describes the breaking rename.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" catch \
  --rule ADM-040 --file 'src/Resources/app/administration/**' --min-severity major \
  --summary 'renam|remov|no longer (exist|render)|deprecat|position.?identifier[^.]{0,80}(chang|break)|(apps?|plugins?|extensions?)\b[^.]{0,80}(break|fail|stop|lose|disappear|no longer)|backward.?compat|\bBC\b|breaking'
