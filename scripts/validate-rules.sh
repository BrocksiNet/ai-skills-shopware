#!/usr/bin/env bash
#
# Check that the rule IDs in skills/**/*.md and rules/catalog.json agree.
# Called from validate-skills.sh; runs on every push.
#
#   scripts/validate-rules.sh
#
# A rule is defined inline by a bold ID, `**TEST-014**`, exactly once. Other
# text may point at a rule with a code span, `TEST-014`.
#
# Fails when:
#   1. an inline ID has no catalog entry, or an active rule is not inline
#   2. an ID is duplicated (catalog or inline), malformed, or its prefix does
#      not match the owning skill (see "prefixes" in the catalog)
#   3. the entry's `file` does not contain the inline ID
#   4. the `eval` task does not exist, or an active rule has neither `eval`
#      nor `eval_reason`
#   5. a retired or superseded ID still appears inline, or a code-span
#      reference or `see` entry names an unknown or inactive ID
#
# Prints coverage: active rules, rules with an eval, documented-only rules.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CATALOG="${RULES_CATALOG:-$ROOT/rules/catalog.json}"

command -v jq >/dev/null || { echo "validate-rules: jq not found" >&2; exit 2; }
[[ -f "$CATALOG" ]] || { echo "validate-rules: $CATALOG not found" >&2; exit 1; }
jq empty "$CATALOG" || { echo "validate-rules: $CATALOG is not valid JSON" >&2; exit 1; }

cd "$ROOT"

# file:line:token, as JSON objects
scan() {
  local pattern="$1"
  { grep -rnoE "$pattern" skills --include='*.md' || true; } |
    jq -R 'capture("^(?<file>[^:]+):(?<line>[0-9]+):[`*]+(?<id>[A-Z]+-[0-9]+)[`*]+$")'
}
defs="$(scan '\*\*[A-Z]+-[0-9]+\*\*' | jq -s .)"
# shellcheck disable=SC2016 # literal backticks: a Markdown code span
refs="$(scan '`[A-Z]+-[0-9]+`' | jq -s .)"
tasks="$(find evals/tasks -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | jq -R . | jq -s .)"
files="$( { find skills -name '*.md' -type f; } | jq -R . | jq -s .)"

errors="$(jq -r --argjson defs "$defs" --argjson refs "$refs" \
  --argjson tasks "$tasks" --argjson files "$files" '
  def where: "\(.file):\(.line)";
  .prefixes as $px
  | .rules as $rules
  | ($rules | map({key: .id, value: .}) | from_entries) as $by
  | def active: .status == "active";
  [
    # catalog entries
    ($rules[] | . as $r
      | (if (.id | test("^[A-Z]+-[0-9]{3}$")) then empty else "\(.id): ID must be PREFIX-NNN" end),
        (if ($px[.id | split("-")[0]] // null) == null then "\(.id): unknown prefix"
         elif $px[.id | split("-")[0]] != .skill then "\(.id): prefix belongs to \($px[.id | split("-")[0]]), not \(.skill)"
         else empty end),
        (if (.status | test("^(active|retired|superseded:[A-Z]+-[0-9]{3})$")) then empty else "\(.id): bad status \(.status)" end),
        (if (.status | startswith("superseded:")) and ($by[.status | ltrimstr("superseded:")] == null)
         then "\(.id): superseded by unknown \(.status | ltrimstr("superseded:"))" else empty end),
        (if (.title // "") == "" then "\(.id): missing title" else empty end),
        (if (.since // "" | test("^[0-9]{4}-[0-9]{2}-[0-9]{2}$")) then empty else "\(.id): since must be YYYY-MM-DD" end),
        (if (.file | startswith("skills/\($r.skill)/")) then empty else "\(.id): file \(.file) is outside skills/\(.skill)/" end),
        (if any($files[]; . == $r.file) | not then "\(.id): file \(.file) not found" else empty end),
        (if .eval != null and (any($tasks[]; . == $r.eval) | not) then "\(.id): eval task \(.eval) not found" else empty end),
        (if active and .eval == null and ((.eval_reason // "") == "") then "\(.id): active rule needs eval or eval_reason" else empty end),
        ((.audience // [])[] | select(IN("core", "plugin", "app", "storefront", "admin") | not) | "\($r.id): unknown audience \(.)"),
        ((.see // [])[] | select($by[.] == null or ($by[.] | active | not)) | "\($r.id): see \(.) is unknown or inactive"),
        (if active then
           ([$defs[] | select(.id == $r.id)]) as $d
           | if ($d | length) == 0 then "\(.id): active rule not found inline in skills/"
             elif ($d | length) > 1 then "\(.id): defined inline \($d | length) times (\($d | map(where) | join(", ")))"
             elif $d[0].file != .file then "\(.id): inline in \($d[0].file), catalog says \(.file)"
             else empty end
         else empty end)
    ),
    # duplicates in the catalog
    ($rules | group_by(.id)[] | select(length > 1) | "\(.[0].id): duplicated in the catalog"),
    # inline definitions without an active entry
    ($defs[] | select($by[.id] == null) | "\(where): \(.id) has no catalog entry"),
    ($defs[] | select($by[.id] != null and ($by[.id] | active | not)) | "\(where): \(.id) is \($by[.id].status) but still inline"),
    # code-span references
    ($refs[] | select($by[.id] == null or ($by[.id] | active | not)) | "\(where): reference to unknown or inactive \(.id)")
  ] | .[]
' "$CATALOG")"

jq -r '
  [.rules[] | select(.status == "active")] as $a
  | "Rules: \($a | length) active, \($a | map(select(.eval != null)) | length) with an eval, \($a | map(select(.eval == null)) | length) documented only, \(.rules | map(select(.status != "active")) | length) retired or superseded",
    ($a | group_by(.skill)[] | "  \(.[0].skill): \(length) active, \(map(select(.eval != null)) | length) with an eval")
' "$CATALOG"

if [[ -n "$errors" ]]; then
  while IFS= read -r line; do echo "  ERROR: $line"; done <<<"$errors"
  echo "validate-rules: $(wc -l <<<"$errors" | tr -d ' ') error(s)"
  exit 1
fi
echo "validate-rules: OK"
