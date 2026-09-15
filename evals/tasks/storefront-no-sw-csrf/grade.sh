#!/usr/bin/env bash
# Grader: storefront-no-sw-csrf
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$(find "$WORKDIR" -name 'login.html.twig' | head -n1 || true)"

if [ -z "$file" ]; then
  echo "score=0 (login.html.twig not found)"
  exit 1
fi

has_route=0
has_method=0
has_email=0
has_submit=0
has_csrf=0

grep -qE "path\s*\(\s*['\"]frontend\.account\.login['\"]" "$file" && has_route=1
grep -qiE 'method="post"' "$file" && has_method=1
grep -qE 'name="email"' "$file" && has_email=1
grep -qE "account\.loginSubmit'|trans" "$file" && has_submit=1
if grep -qE 'sw_csrf|_csrf_token|name="csrf' "$file"; then
  has_csrf=1
fi

score=0
if [ "$has_route" -eq 1 ] && [ "$has_method" -eq 1 ] && [ "$has_email" -eq 1 ] && [ "$has_submit" -eq 1 ] && [ "$has_csrf" -eq 0 ]; then
  score=1
fi

echo "score=$score (route=$has_route method=$has_method email=$has_email submit=$has_submit csrf=$has_csrf)"
[ "$score" -eq 1 ]
