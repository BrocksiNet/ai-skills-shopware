#!/usr/bin/env bash
# Grader: review-test-cannot-fail-catch (shopware-testing, TEST-035)
# The assertions on the captured event sit inside if ($changed !== null), so
# the test passes when the event is never dispatched. Capturing in the hook
# is fine (TEST-016). Needs a major+ finding in tests/ that names TEST-035
# or describes the test that cannot fail.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" catch \
  --rule TEST-035 --file 'tests/**' --min-severity major \
  --summary 'cannot fail|can.t fail|never fails?|passes (even )?(when|if)|silently pass|vacuous|assertNotNull|assertInstanceOf|if \(\$\w+ !== null\)|(hook|event) (was )?(never )?(fired|dispatched)'
