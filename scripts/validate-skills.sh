#!/usr/bin/env bash
#
# Static validation of every skill. Cheap, deterministic, runs on every PR.
#
# Checks:
#   - frontmatter `name` == folder name
#   - description length < 1024 chars (the budget every provider loads up front)
#   - SKILL.md < 500 lines (progressive-disclosure body budget)
#   - evals/should-trigger.md and evals/should-not-trigger.md exist
#   - every references/*.md linked from a SKILL.md actually exists (no dead
#     internal links -> self-containment)
# Conflict detection:
#   - duplicate topic ownership in REGISTRY.md coverage matrix
#   - the same double-quoted trigger phrase claimed by two skills' descriptions
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$ROOT/skills"
REGISTRY="$ROOT/REGISTRY.md"

errors=0
err() { echo "  ERROR: $*"; errors=$((errors+1)); }

trim() { echo "$1" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e "s/^[\"']//" -e "s/[\"']$//"; }

# ---- per-skill checks -------------------------------------------------------
triggers_tmp="$(mktemp)"
trap 'rm -f "$triggers_tmp"' EXIT

for dir in "$SKILLS_DIR"/*/; do
  skill="$(basename "$dir")"
  md="${dir}SKILL.md"
  echo "Checking $skill"
  [ -f "$md" ] || { err "$skill: missing SKILL.md"; continue; }

  name="$(awk 'NR==1&&$0=="---"{fm=1;next} fm&&/^---/{exit} fm&&/^name:/{sub(/^name:[[:space:]]*/,"");print;exit}' "$md")"
  name="$(trim "$name")"
  [ "$name" = "$skill" ] || err "$skill: frontmatter name '$name' != folder name"

  desc="$(awk '
    NR==1 && $0=="---" {fm=1; next}
    fm && /^---/ {exit}
    fm && /^description:/ {
      d=$0; sub(/^description:[[:space:]]*/,"",d);
      if (d==">-"||d==">"||d=="|"||d=="|-"||d=="") {coll=1; next}
      printf "%s", d; coll=1; next
    }
    fm && coll {
      if (/^[A-Za-z0-9_-]+:[[:space:]]/) {exit}
      l=$0; sub(/^[[:space:]]+/,"",l); printf " %s", l
    }
  ' "$md")"
  dlen=${#desc}
  [ "$dlen" -lt 1024 ] || err "$skill: description is $dlen chars (>= 1024)"
  [ "$dlen" -gt 0 ] || err "$skill: empty description"

  lines="$(wc -l < "$md" | tr -d ' ')"
  [ "$lines" -lt 500 ] || err "$skill: SKILL.md is $lines lines (>= 500)"

  [ -f "${dir}evals/should-trigger.md" ] || err "$skill: missing evals/should-trigger.md"
  [ -f "${dir}evals/should-not-trigger.md" ] || err "$skill: missing evals/should-not-trigger.md"

  # internal reference links must resolve (only real markdown link targets
  # ](references/x.md), not bare prose mentions of another skill's references)
  while IFS= read -r rel; do
    [ -z "$rel" ] && continue
    [ -f "${dir}${rel}" ] || err "$skill: dead internal link references/ -> $rel"
  done < <(grep -oE '\]\(references/[A-Za-z0-9_./-]+\.md\)' "$md" | sed -E 's/^\]\(//; s/\)$//' | sort -u)

  # collect double-quoted trigger phrases for cross-skill overlap detection
  echo "$desc" | grep -oE '"[^"]+"' | sed 's/"//g' | while IFS= read -r phrase; do
    [ -n "$phrase" ] && printf '%s\t%s\n' "$phrase" "$skill" >> "$triggers_tmp"
  done
done

# ---- conflict: overlapping trigger phrases ----------------------------------
if [ -s "$triggers_tmp" ]; then
  while IFS= read -r phrase; do
    owners="$(awk -F'\t' -v p="$phrase" '$1==p{print $2}' "$triggers_tmp" | sort -u | tr '\n' ' ')"
    n="$(echo "$owners" | wc -w | tr -d ' ')"
    [ "$n" -gt 1 ] && err "overlapping trigger phrase \"$phrase\" claimed by: $owners"
  done < <(cut -f1 "$triggers_tmp" | sort | uniq -d)
fi

# ---- conflict: duplicate topic ownership in REGISTRY coverage matrix --------
if [ -f "$REGISTRY" ]; then
  dup="$(awk '
    /^## Coverage matrix/ {inm=1; next}
    inm && /^## / {inm=0}
    inm && /^\| / {
      # skip header + separator rows
      if ($0 ~ /Topic/ || $0 ~ /^\|[ -]+\|/) next
      n=split($0, a, "|"); topic=a[2];
      gsub(/^[[:space:]]+|[[:space:]]+$/,"",topic);
      if (topic!="") print topic
    }
  ' "$REGISTRY" | sort | uniq -d)"
  if [ -n "$dup" ]; then
    while IFS= read -r t; do err "duplicate topic ownership in REGISTRY.md: '$t'"; done <<< "$dup"
  fi
else
  err "REGISTRY.md not found"
fi

echo
if [ "$errors" -eq 0 ]; then
  echo "validate-skills: OK"
else
  echo "validate-skills: $errors error(s)"
  exit 1
fi
