#!/usr/bin/env bash
# Grader: business-logic-in-controller
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"

controller="$(grep -rl --include='*.php' 'ProductController' "$WORKDIR" 2>/dev/null | head -n1 || true)"
service="$(grep -rl --include='*.php' 'ProductListingService' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$controller" ]; then
  echo "score=0 (ProductController.php not found)"
  exit 1
fi

dal_in_controller=0
has_service=0
controller_delegates=0

if grep -qE 'EntityRepository|->search\s*\(|new Criteria' "$controller"; then
  dal_in_controller=1
fi

[ -n "$service" ] && has_service=1

if grep -qE 'ProductListingService|listingService' "$controller"; then
  controller_delegates=1
fi

score=0
if [ "$dal_in_controller" -eq 0 ] && [ "$has_service" -eq 1 ] && [ "$controller_delegates" -eq 1 ]; then
  score=1
fi

echo "score=$score (dal_ctrl=$dal_in_controller service=$has_service delegate=$controller_delegates)"
[ "$score" -eq 1 ]
