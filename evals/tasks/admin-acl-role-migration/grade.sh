#!/usr/bin/env bash
# Grader: admin-acl-role-migration
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
php="$(find "$WORKDIR" -name '*.php' | head -n1 || true)"

has_mapping=0
has_privilege=0
has_migration=0
has_role_guard=0
has_idempotent=0
appends_product=0
overgrant=0
keeps_module=0

grep -rqE --include='*.js' --include='*.ts' 'addPrivilegeMappingEntry\s*\(' "$WORKDIR" && has_mapping=1
grep -rqE --include='*.js' --include='*.ts' "product:read" "$WORKDIR" && has_privilege=1
if [[ -n "$php" ]]; then
  grep -q 'acl_role' "$php" && has_migration=1
  grep -q "product:read" "$php" && appends_product=1
  if grep -qE "JSON_CONTAINS\s*\(\s*privileges\s*,\s*JSON_QUOTE\s*\(\s*'swag_example\.viewer'\s*\)" "$php"; then
    has_role_guard=1
  fi
  if grep -qE "NOT[[:space:]]+JSON_CONTAINS\s*\(\s*privileges\s*,\s*JSON_QUOTE\s*\(\s*'product:read'\s*\)" "$php"; then
    has_idempotent=1
  fi
  if grep -qE "'privilege'\s*=>\s*'swag_example\.viewer'" "$php"; then
    overgrant=1
  fi
  if grep -qE 'UPDATE[[:space:]]+acl_role' "$php" && [[ "$has_role_guard" -eq 0 ]]; then
    overgrant=1
  fi
fi
grep -rqE --include='*.js' --include='*.ts' "Module\.register\s*\(\s*['\"]swag-example['\"]" "$WORKDIR" && keeps_module=1

score=0
if [ "$has_mapping" -eq 1 ] && [ "$has_privilege" -eq 1 ] && [ "$has_migration" -eq 1 ] && [ "$has_role_guard" -eq 1 ] && [ "$has_idempotent" -eq 1 ] && [ "$appends_product" -eq 1 ] && [ "$overgrant" -eq 0 ] && [ "$keeps_module" -eq 1 ]; then
  score=1
fi

echo "score=$score (mapping=$has_mapping privilege=$has_privilege migration=$has_migration role_guard=$has_role_guard idempotent=$has_idempotent product_sql=$appends_product overgrant=$overgrant module=$keeps_module)"
[ "$score" -eq 1 ]
