#!/usr/bin/env bash
# Grader: store-api-route-missing-acl
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(grep -rl --include='*.php' 'ProtectedRoute' "$WORKDIR" 2>/dev/null | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (ProtectedRoute.php not found)"
  exit 1
fi

has_acl=0

if grep -qE "_acl|Acl|privilege|Administration::" "$file"; then
  has_acl=1
fi

echo "score=$has_acl (acl=$has_acl)"
[ "$has_acl" -eq 1 ]
