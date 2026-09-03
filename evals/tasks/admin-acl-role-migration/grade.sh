#!/usr/bin/env bash
# Grader: admin-acl-role-migration
set -euo pipefail

# shellcheck source=../../grade-helpers.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/grade-helpers.sh"

WORKDIR="${WORKDIR:?WORKDIR not set}"
php="$(grep -rlE --include='*.php' 'extends[[:space:]]+MigrationStep' "$WORKDIR" 2>/dev/null | head -n1 || true)"
index="$(find "$WORKDIR" \( -path '*/swag-example/index.js' -o -path '*/swag-example/index.ts' \) | head -n1 || true)"

has_mapping=0
has_privilege=0
has_roles_shape=0
has_invalid_shape=0
has_migration=0
has_role_guard=0
has_idempotent=0
appends_product=0
overgrant=0
keeps_module=0

js_flat=""
mapping=""
if [[ -n "$index" ]]; then
  js_flat="$(grade_without_comments "$index" | tr '\n' ' ')"
  mapping="$(grade_js_call_args "$index" addPrivilegeMappingEntry | tr '\n' ' ')"
fi

[[ -n "$mapping" ]] && has_mapping=1
printf '%s' "$mapping" | grep -qE "product:read" && has_privilege=1
# Shape must belong to the mapping argument, not a leftover object.
if printf '%s' "$mapping" | grep -qE 'roles\s*:\s*\{' \
  && printf '%s' "$mapping" | grep -qE 'viewer\s*:\s*\{' \
  && printf '%s' "$mapping" | grep -qE 'privileges\s*:\s*\[' \
  && printf '%s' "$mapping" | grep -qE 'dependencies\s*:\s*\['; then
  has_roles_shape=1
fi
if printf '%s' "$mapping" | grep -qE 'privileges\s*:\s*\{\s*viewer\s*:'; then
  has_invalid_shape=1
fi
if [[ -n "$php" ]] && grep -qE 'function[[:space:]]+update[[:space:]]*\(' "$php"; then
  has_migration=1
  update="$(grade_php_method_flat "$php" update)"
  if printf '%s' "$update" | grep -qE 'UPDATE[[:space:]]+acl_role'; then
    if printf '%s' "$update" | grep -qE "'privilege'\s*=>\s*'product:read'"; then
      appends_product=1
    fi
    if printf '%s' "$update" | grep -qE "JSON_CONTAINS\s*\(\s*privileges\s*,\s*JSON_QUOTE\s*\(\s*'swag_example\.viewer'\s*\)"; then
      has_role_guard=1
    fi
    if printf '%s' "$update" | grep -qE "NOT[[:space:]]+JSON_CONTAINS\s*\(\s*privileges\s*,\s*JSON_QUOTE\s*\(\s*'product:read'\s*\)"; then
      has_idempotent=1
    fi
  fi
  if printf '%s' "$update" | grep -qE "'privilege'\s*=>\s*'swag_example\.viewer'"; then
    overgrant=1
  fi
  if printf '%s' "$update" | grep -qE 'UPDATE[[:space:]]+acl_role' && [[ "$has_role_guard" -eq 0 ]]; then
    overgrant=1
  fi
fi
printf '%s' "$js_flat" | grep -qE "Module\.register\s*\(\s*['\"]swag-example['\"]" && keeps_module=1

score=0
if [ "$has_mapping" -eq 1 ] && [ "$has_privilege" -eq 1 ] && [ "$has_roles_shape" -eq 1 ] && [ "$has_invalid_shape" -eq 0 ] && [ "$has_migration" -eq 1 ] && [ "$has_role_guard" -eq 1 ] && [ "$has_idempotent" -eq 1 ] && [ "$appends_product" -eq 1 ] && [ "$overgrant" -eq 0 ] && [ "$keeps_module" -eq 1 ]; then
  score=1
fi

echo "score=$score (mapping=$has_mapping privilege=$has_privilege roles=$has_roles_shape invalid_shape=$has_invalid_shape migration=$has_migration role_guard=$has_role_guard idempotent=$has_idempotent product_sql=$appends_product overgrant=$overgrant module=$keeps_module)"
[ "$score" -eq 1 ]
