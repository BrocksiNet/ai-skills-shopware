#!/usr/bin/env bash
# Grader: symfony-filesystem-over-raw-php
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'SnippetDumper' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (SnippetDumper.php not found)"
  exit 1
fi

uses_component=0
uses_dump=0
uses_raw=0

grep -q 'use Symfony\\Component\\Filesystem\\Filesystem' "$file" && uses_component=1
grep -qE -- '->dumpFile\s*\(' "$file" && uses_dump=1
if grep -qE 'file_put_contents\s*\(|\bmkdir\s*\(|\bunlink\s*\(' "$file"; then
  uses_raw=1
fi

score=0
if [ "$uses_component" -eq 1 ] && [ "$uses_dump" -eq 1 ] && [ "$uses_raw" -eq 0 ]; then
  score=1
fi

echo "score=$score (component=$uses_component dump=$uses_dump raw=$uses_raw)"
[ "$score" -eq 1 ]
