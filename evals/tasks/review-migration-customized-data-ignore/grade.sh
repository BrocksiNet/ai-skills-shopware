#!/usr/bin/env bash
# Grader: review-migration-customized-data-ignore (shopware-plugin-development, PLG-028)
# The same update guarded with `updated_at IS NULL`. A minor+ finding that
# names PLG-028 or says merchant edits get overwritten is a false positive.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" ignore \
  --rule PLG-028 \
  --summary 'customi[sz]|merchant|shop owner|edited|modified by|updated_at|overwrit|clobber|user.?made|own (template|text|changes)'
