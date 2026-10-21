#!/usr/bin/env bash
# Grader: review-deprecation-internal-replacement-catch (shopware-core-development, CORE-063)
# ProductPriceCalculator::calculate() is deprecated with a runtime warning,
# but its replacement ProductPriceCalculatorV2 is marked @internal, so
# extensions get a warning they cannot act on. Needs a major+ finding in
# src/Core/ that names CORE-063 or describes the unusable replacement.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" catch \
  --rule CORE-063 --file 'src/Core/**' --min-severity major \
  --summary '@internal|internal|experimental|not (yet )?(usable|available|public)|cannot (use|act|migrate)|can.t (use|act|migrate)|no (usable|public) replacement|replacement[^.]{0,60}(internal|not public|unusable)|silent'
