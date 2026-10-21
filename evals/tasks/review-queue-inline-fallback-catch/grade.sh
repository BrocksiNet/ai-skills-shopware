#!/usr/bin/env bash
# Grader: review-queue-inline-fallback-catch (shopware-review-learnings, REV-033)
# When dispatching the export message fails, the subscriber runs the
# 2 to 10 second ERP export inline during checkout. Needs a major+ finding
# in src/ that names REV-033 or describes the synchronous fallback.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" catch \
  --rule REV-033 --file 'src/**' --min-severity major \
  --summary 'inline|synchronous|fallback|in the (checkout |storefront )?request|blocks? (the )?(checkout|request|customer)|request thread'
