#!/usr/bin/env bash
# Grader: review-queue-inline-fallback-ignore (shopware-review-learnings, REV-033)
# The subscriber only dispatches the message (with an early return for free
# orders); the handler does the export. A minor+ finding that names REV-033
# or calls the export synchronous is a false positive.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" ignore \
  --rule REV-033 \
  --summary 'inline|synchronous|fallback|in the (checkout |storefront )?request|blocks? (the )?(checkout|request|customer)|request thread'
