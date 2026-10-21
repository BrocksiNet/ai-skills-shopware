#!/usr/bin/env bash
# Grader: review-deprecation-internal-replacement-ignore (shopware-core-development, CORE-063)
# The same deprecation, with a public replacement class shipped in the
# same change. A minor+ finding that names CORE-063 or calls the replacement
# internal or unusable is a false positive.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" ignore \
  --rule CORE-063 \
  --summary '@internal|internal|experimental|not (yet )?(usable|available|public)|cannot (use|act|migrate)|can.t (use|act|migrate)|no (usable|public) replacement|replacement[^.]{0,60}(internal|not public|unusable)|silent'
