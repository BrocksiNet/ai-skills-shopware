#!/usr/bin/env bash
# Grader: review-cache-disabled-for-logged-in-ignore (shopware-storefront, SF-013)
# The balance moves out of the cached page into a JS plugin that loads it
# from the Store API after paint; the page stays cacheable. A minor+
# finding that names SF-013 or says caching is switched off is a false
# positive.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec node "${ROOT}/tools/bin/grade-findings.ts" ignore \
  --rule SF-013 \
  --summary 'no-store|cache-control|private|disabl\w* (the )?(http |page )?cach|cach\w* (is )?(disabled|switched off|turned off|bypassed)|bypass\w* (the )?(http |page )?cach|uncached|cache polic|logged.in[^.]{0,80}cach|cach\w*[^.]{0,80}logged.in'
