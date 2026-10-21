#!/usr/bin/env bash
# Grader: review-migration-narrowing-update-ignore (shopware-plugin-development, PLG-030)
# update() widens external_ref and adds a nullable column, both safe in a
# non-destructive migration. A minor+ finding that names PLG-030 or calls it
# narrowing, destructive or data loss is a false positive.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" ignore \
  --rule PLG-030 \
  --summary 'narrow|shrink|shorten|truncat|NOT NULL|without (a )?default|no default|updateDestructive|destructive|data loss|lose data|existing (rows|values|data)|longer than 64'
