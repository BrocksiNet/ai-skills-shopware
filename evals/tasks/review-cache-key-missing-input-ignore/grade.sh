#!/usr/bin/env bash
# Grader: review-cache-key-missing-input-ignore (shopware-change-impact, IMP-008)
# The cache key hashes every input (product, limit, sales channel, language,
# currency, customer group). A minor+ finding that names IMP-008 or calls
# the key incomplete is a false positive.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" ignore \
  --rule IMP-008 \
  --summary 'cache key|(key|cache)[^.]{0,80}(missing|lacks?|without|ignores?|omits?|leaves? out|only (uses|contains|includes|the product))|(missing|lacks?|without|ignores?|omits?)[^.]{0,80}(sales.?channel|language|limit|customer group|currency)[^.]{0,40}(key|cache)|wrong (result|recommendations?|products?) (for|to)|(another|other|different) (sales.?channels?|languages?|customer groups?|callers?)|cross.?(sales.?channel|language)|leak'
