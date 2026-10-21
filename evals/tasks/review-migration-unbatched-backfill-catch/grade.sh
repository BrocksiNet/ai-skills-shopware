#!/usr/bin/env bash
# Grader: review-migration-unbatched-backfill-catch (shopware-plugin-development, PLG-019)
# The backfill updates every swag_review row in one statement with a
# correlated subquery over order_line_item. Needs a major+ finding in
# src/Migration/ that names PLG-019 or asks for batches.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" catch \
  --rule PLG-019 --file 'src/Migration/**' --min-severity major \
  --summary 'batch|chunk|single (UPDATE|statement|query)|one (UPDATE|statement|query)|whole table|entire table|every row|all rows|large (table|shops?)|big (table|shops?)|\block|time ?out|cursor'
