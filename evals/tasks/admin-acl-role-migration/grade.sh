#!/usr/bin/env bash
# Grader: admin-acl-role-migration
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"

has_mapping=0
has_privilege=0
has_migration=0
keeps_module=0

grep -rqE --include='*.js' --include='*.ts' 'addPrivilegeMappingEntry\s*\(' "$WORKDIR" && has_mapping=1
grep -rqE --include='*.js' --include='*.ts' "product:read" "$WORKDIR" && has_privilege=1
if grep -rqE --include='*.php' 'acl_role' "$WORKDIR"; then
  has_migration=1
fi
grep -rqE --include='*.js' --include='*.ts' "Module\.register\s*\(\s*['\"]swag-example['\"]" "$WORKDIR" && keeps_module=1

score=0
if [ "$has_mapping" -eq 1 ] && [ "$has_privilege" -eq 1 ] && [ "$has_migration" -eq 1 ] && [ "$keeps_module" -eq 1 ]; then
  score=1
fi

echo "score=$score (mapping=$has_mapping privilege=$has_privilege migration=$has_migration module=$keeps_module)"
[ "$score" -eq 1 ]
