#!/usr/bin/env bash
# Grader: review-test-cannot-fail-ignore (shopware-testing, TEST-035)
# The test asserts the captured event with assertInstanceOf before reading
# its fields. A minor+ finding that names TEST-035 or says the test passes
# without the event is a false positive.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" ignore \
  --rule TEST-035 \
  --summary 'cannot fail|can.t fail|never fails?|passes (even )?(when|if)|silently pass|vacuous|assertNotNull|assertInstanceOf|if \(\$\w+ !== null\)|(hook|event) (was )?(never )?(fired|dispatched)'
