#!/usr/bin/env bash
# Grader: core-http-client-behind-flag
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'RemoteSnippetFetcher' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (RemoteSnippetFetcher.php not found)"
  exit 1
fi

uses_flag=0
uses_http_client=0
keeps_legacy=0
has_constructor=0

grep -qE 'Feature::isActive\s*\(' "$file" && uses_flag=1
grep -qE 'HttpClientInterface' "$file" && uses_http_client=1
grep -qE 'file_get_contents\s*\(' "$file" && keeps_legacy=1
grep -qE '__construct' "$file" && has_constructor=1

score=0
if [ "$uses_flag" -eq 1 ] && [ "$uses_http_client" -eq 1 ] && [ "$keeps_legacy" -eq 1 ] \
  && [ "$has_constructor" -eq 1 ]; then
  score=1
fi

echo "score=$score (flag=$uses_flag http_client=$uses_http_client legacy=$keeps_legacy construct=$has_constructor)"
[ "$score" -eq 1 ]
