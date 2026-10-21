#!/usr/bin/env bash
# Grader entry for Harbor, the smoke harness and the runner. The checks are
# in tools/graders/<task>.ts; tools/bin/grade.ts runs them.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "${HERE}/../../../tools/bin/grade.ts" "$(basename "${HERE}")"
