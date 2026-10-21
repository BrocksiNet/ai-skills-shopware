#!/usr/bin/env bash
# Grader: review-cache-key-missing-input-catch (shopware-change-impact, IMP-008)
# The new cache key holds only the product id, but the result depends on
# the limit, sales channel, language and customer group. One caller gets
# another caller's recommendations. Needs a major+ finding in src/ that
# names IMP-008 or describes the incomplete cache key.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" catch \
  --rule IMP-008 --file 'src/**' --min-severity major \
  --summary 'cache key|(key|cache)[^.]{0,80}(missing|lacks?|without|ignores?|omits?|leaves? out|only (uses|contains|includes|the product))|(missing|lacks?|without|ignores?|omits?)[^.]{0,80}(sales.?channel|language|limit|customer group|currency)[^.]{0,40}(key|cache)|wrong (result|recommendations?|products?) (for|to)|(another|other|different) (sales.?channels?|languages?|customer groups?|callers?)|cross.?(sales.?channel|language)|leak'
