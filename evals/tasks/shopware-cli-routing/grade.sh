#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "${HERE}/../../../tools/bin/grade.ts" "$(basename "${HERE}")"
