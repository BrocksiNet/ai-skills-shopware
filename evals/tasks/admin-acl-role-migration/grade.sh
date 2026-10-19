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
uses_helper=0
grants_product=0
raw_acl_write=0
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
  php_flat="$(grade_without_comments "$php" | tr '\n' ' ')"
  # Existing roles get the privilege through MigrationStep::addAdditionalPrivileges(),
  # which only touches roles that already hold the key. Raw writes to acl_role
  # bypass those guards (core review guide MIG-007).
  # shellcheck disable=SC2016 # literal $this in the pattern
  if printf '%s' "$update" | grep -qE '\$this->addAdditionalPrivileges[[:space:]]*\('; then
    uses_helper=1
    args="$(grade_js_call_args "$php" addAdditionalPrivileges | tr '\n' ' ')"
    literal="['\"]swag_example\.viewer['\"][[:space:]]*=>[[:space:]]*\[[^]]*['\"]product:read['\"]"
    if printf '%s' "$args" | grep -qE "$literal"; then
      grants_product=1
    else
      # Accept a class constant or a local variable that holds the mapping.
      ref="$(printf '%s' "$args" | grep -oE '(self|static)::[A-Za-z_][A-Za-z0-9_]*' | head -n1 | sed -E 's/^(self|static):://' || true)"
      var="$(printf '%s' "$args" | grep -oE ',[[:space:]]*\$[A-Za-z_][A-Za-z0-9_]*' | head -n1 | sed -E 's/^,[[:space:]]*\$//' || true)"
      if [[ -n "$ref" ]] && printf '%s' "$php_flat" | grep -qE "const[[:space:]]+([A-Za-z?]+[[:space:]]+)?${ref}[[:space:]]*=[[:space:]]*\[[[:space:]]*${literal}"; then
        grants_product=1
      elif [[ -n "$var" ]] && printf '%s' "$update" | grep -qE "\\\$${var}[[:space:]]*=[[:space:]]*\[[[:space:]]*${literal}"; then
        grants_product=1
      fi
    fi
    if printf '%s' "$args $php_flat" | grep -qE "=>[[:space:]]*\[[^]]*['\"]swag_example\.viewer['\"]"; then
      overgrant=1
    fi
  fi
  if printf '%s' "$update" | grep -qiE 'UPDATE[[:space:]]+`?acl_role|(update|insert|executeStatement)[[:space:]]*\([[:space:]]*['\''"]acl_role'; then
    raw_acl_write=1
  fi
fi
printf '%s' "$js_flat" | grep -qE "Module\.register\s*\(\s*['\"]swag-example['\"]" && keeps_module=1

score=0
if [ "$has_mapping" -eq 1 ] && [ "$has_privilege" -eq 1 ] && [ "$has_roles_shape" -eq 1 ] && [ "$has_invalid_shape" -eq 0 ] && [ "$has_migration" -eq 1 ] && [ "$uses_helper" -eq 1 ] && [ "$grants_product" -eq 1 ] && [ "$raw_acl_write" -eq 0 ] && [ "$overgrant" -eq 0 ] && [ "$keeps_module" -eq 1 ]; then
  score=1
fi

echo "score=$score (mapping=$has_mapping privilege=$has_privilege roles=$has_roles_shape invalid_shape=$has_invalid_shape migration=$has_migration helper=$uses_helper grants=$grants_product raw_acl_write=$raw_acl_write overgrant=$overgrant module=$keeps_module)"
[ "$score" -eq 1 ]
