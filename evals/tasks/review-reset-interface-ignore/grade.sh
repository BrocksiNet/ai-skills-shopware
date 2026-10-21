#!/usr/bin/env bash
# Grader: review-reset-interface-ignore (shopware-architecture, ARCH-001)
# The same memoization, but the service implements ResetInterface and
# reset() clears both arrays. A minor+ finding that names ARCH-001 or calls
# the cache stale or unreset is a false positive.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" ignore \
  --rule ARCH-001 \
  --summary 'ResetInterface|kernel\.reset|reset\(\)|never (cleared|reset)|stale|long.running|workers?\b|across requests|between requests'
