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
has_ctor=0
uses_receiver=0
uses_raw=0
uses_new=0

grep -q 'use Symfony\\Component\\Filesystem\\Filesystem' "$file" && uses_component=1
grep -qE 'private readonly Filesystem \$filesystem' "$file" && has_ctor=1
grep -qE -- '\$this->filesystem->dumpFile\s*\(' "$file" && uses_receiver=1
if grep -qE 'file_put_contents\s*\(|\bmkdir\s*\(|\bunlink\s*\(' "$file"; then
  uses_raw=1
fi
if grep -qE 'new[[:space:]]+Filesystem\s*\(' "$file"; then
  uses_new=1
fi

score=0
if [ "$uses_component" -eq 1 ] && [ "$has_ctor" -eq 1 ] && [ "$uses_receiver" -eq 1 ] && [ "$uses_raw" -eq 0 ] && [ "$uses_new" -eq 0 ]; then
  score=1
fi

echo "score=$score (component=$uses_component ctor=$has_ctor receiver=$uses_receiver raw=$uses_raw new=$uses_new)"
[ "$score" -eq 1 ]
