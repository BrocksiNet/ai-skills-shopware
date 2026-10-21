#!/usr/bin/env bash
# Grader: review-reset-interface-catch (shopware-architecture, ARCH-001)
# LoyaltyConfigReader memoizes per-sales-channel config in properties and
# never clears them. Workers and other long-running processes keep the old
# rates after the merchant changes the config. Needs a major+ finding in
# src/ that names ARCH-001 or describes the missing reset.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" catch \
  --rule ARCH-001 --file 'src/**' --min-severity major \
  --summary 'ResetInterface|kernel\.reset|reset\(\)|never (cleared|reset)|stale|long.running|workers?\b|across requests|between requests'
