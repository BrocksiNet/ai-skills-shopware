#!/usr/bin/env bash
# Grader: review-store-api-contract-catch (shopware-plugin-development, PLG-027)
# The released /store-api/loyalty/balance route changes `points` from a
# non-null integer to a nullable number. Needs a major+ finding in src/ that
# names PLG-027 or describes the breaking type or nullability change.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" catch \
  --rule PLG-027 --file 'src/**' --min-severity major \
  --summary 'nullab|type change|changes? (the |its )?(response |field )?type|from int\w* to|breaking|backward.?compat|\bBC\b|existing clients'
