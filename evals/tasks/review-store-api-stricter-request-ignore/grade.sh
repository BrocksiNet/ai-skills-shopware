#!/usr/bin/env bash
# Grader: review-store-api-stricter-request-ignore (shopware-plugin-development, PLG-031)
# The change adds an optional `note` parameter and keeps the existing
# validation. A minor+ finding that names PLG-031 or calls the route
# stricter or breaking is a false positive.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" ignore \
  --rule PLG-031 \
  --summary 'required|stricter|reject|no longer accept|now fails?|400|validation|breaking|backward.?compat|\bBC\b|existing (clients|callers|integrations|requests)'
