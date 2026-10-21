#!/usr/bin/env bash
# Grader: review-migration-feature-flag-ignore (shopware-plugin-development, PLG-029)
# The migration adds the column unconditionally; only the tier resolver
# reads the flag. A minor+ finding that names PLG-029 or ties the flag to the
# migration or schema is a false positive.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" ignore \
  --rule PLG-029 \
  --summary '(migration|schema|column)[^.]{0,80}(feature.?flag|Feature::|\bflag\b)|(feature.?flag|Feature::|\bflag\b)[^.]{0,80}(migration|schema|column)'
