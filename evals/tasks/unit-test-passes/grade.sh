#!/usr/bin/env bash
# Grader: unit-test-passes
# PASS when a unit-style PHPUnit test exists (TestCase, assertSame, data
# provider, no kernel/DB) and, if phpunit + composer are available, it runs green.
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
test_file="$(grep -rl --include='*.php' 'PriceCalculatorTest' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$test_file" ]; then
  echo "score=0 (PriceCalculatorTest.php not found)"
  exit 1
fi

structural=1
grep -qE 'extends\s+TestCase' "$test_file" || structural=0
grep -qE 'assertSame' "$test_file" || structural=0
grep -qiE 'DataProvider' "$test_file" || structural=0
# unit test must not pull in the kernel / DB
if grep -qE 'IntegrationTestBehaviour|KernelTestBehaviour|getContainer\(' "$test_file"; then
  structural=0
fi

ran=skipped
if [ -x "$WORKDIR/vendor/bin/phpunit" ]; then
  if (cd "$WORKDIR" && vendor/bin/phpunit "$test_file" >/dev/null 2>&1); then ran=pass; else ran=fail; fi
fi

score=0
if [ "$structural" -eq 1 ] && [ "$ran" != "fail" ]; then
  score=1
fi

echo "score=$score (structural=$structural phpunit=$ran)"
[ "$score" -eq 1 ]
