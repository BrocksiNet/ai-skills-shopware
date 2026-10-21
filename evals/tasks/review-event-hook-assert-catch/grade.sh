#!/usr/bin/env bash
# Grader: review-event-hook-assert-catch (shopware-testing, TEST-016)
# The test asserts inside the event hook closure. GiftCardRedeemer swallows
# listener exceptions, so a failing assertion never fails the test. Needs a
# major+ finding in tests/ that names TEST-016 or describes the problem.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" catch \
  --rule TEST-016 --file 'tests/**' --min-severity major \
  --summary 'assert\w*[^.]{0,80}\b(hook|closure|callback|listener)|\b(hook|closure|callback|listener)\b[^.]{0,80}assert'
