#!/usr/bin/env bash
# Grader: review-store-api-stricter-request-catch (shopware-plugin-development, PLG-031)
# The released /store-api/swag-wishlist/add route now requires `list` and a
# new `note` parameter and no longer accepts `later`. Clients that worked
# before get 400 errors. Needs a major+ finding in src/ that names PLG-031
# or describes the new required input or stricter validation.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" catch \
  --rule PLG-031 --file 'src/**' --min-severity major \
  --summary 'required|stricter|reject|no longer accept|now fails?|400|validation|breaking|backward.?compat|\bBC\b|existing (clients|callers|integrations|requests)'
