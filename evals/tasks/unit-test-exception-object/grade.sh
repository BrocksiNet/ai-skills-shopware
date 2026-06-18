#!/usr/bin/env bash
# Grader: unit-test-exception-object
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'InvalidQuantityValidatorTest' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (InvalidQuantityValidatorTest.php not found)"
  exit 1
fi

uses_object=0
uses_message=0
uses_depends=0
uses_any=0
uses_kernel=0

grep -qE 'expectExceptionObject\s*\(' "$file" && uses_object=1
grep -qE 'expectExceptionMessage\s*\(' "$file" && uses_message=1
grep -qE '#\[Depends\]' "$file" && uses_depends=1
grep -qE '\bany\s*\(' "$file" && uses_any=1
grep -qE 'IntegrationTestBehaviour|KernelTestBehaviour|getContainer\s*\(' "$file" && uses_kernel=1

score=0
if [ "$uses_object" -eq 1 ] && [ "$uses_message" -eq 0 ] && [ "$uses_depends" -eq 0 ] \
  && [ "$uses_any" -eq 0 ] && [ "$uses_kernel" -eq 0 ]; then
  score=1
fi

echo "score=$score (object=$uses_object message=$uses_message depends=$uses_depends any=$uses_any kernel=$uses_kernel)"
[ "$score" -eq 1 ]
