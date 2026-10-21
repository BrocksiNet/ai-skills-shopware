#!/usr/bin/env bash
# Grader: review-migration-feature-flag-catch (shopware-plugin-development, PLG-029)
# The migration branches on Feature::isActive(), so the flag state at
# migration time decides the schema for good. Needs a major+ finding in
# src/Migration/ that names PLG-029 or describes the flag-dependent schema.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" catch \
  --rule PLG-029 --file 'src/Migration/**' --min-severity major \
  --summary '(migration|schema|column)[^.]{0,80}(feature.?flag|Feature::|\bflag\b)|(feature.?flag|Feature::|\bflag\b)[^.]{0,80}(migration|schema|column)'
