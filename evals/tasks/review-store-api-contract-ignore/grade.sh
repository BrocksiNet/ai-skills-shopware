#!/usr/bin/env bash
# Grader: review-store-api-contract-ignore (shopware-plugin-development, PLG-027)
# The change adds an optional `pointsExpireAt` field and leaves the existing
# fields alone. A minor+ finding that names PLG-027 or calls it a breaking
# contract change is a false positive.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" ignore \
  --rule PLG-027 \
  --summary 'nullab|type change|changes? (the |its )?(response |field )?type|from int\w* to|breaking|backward.?compat|\bBC\b|existing clients'
