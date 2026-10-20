#!/usr/bin/env bash
#
# Pick the eval tasks for a model run and split them into shards.
#
#   scripts/eval-plan.sh
#
# Env:
#   EVAL_TASKS          comma-separated task names; empty = all tasks
#   EVAL_CHANGED_FILES  path to a file with one changed repo path per line
#                       (PR mode). Selects tasks whose folder changed, whose
#                       `skills` file names a changed skill, or, when they have
#                       no `skills` file, any changed skill. Ignored when
#                       EVAL_TASKS is set.
#   EVAL_MAX_TASKS      cap after selection; 0 = no cap (default 0)
#   EVAL_SHARDS         number of shards (default 4)
#
# Prints one JSON object:
#   {"tasks":["a","b"],"count":2,"shards":[{"id":1,"tasks":"a"},{"id":2,"tasks":"b"}]}
# Empty shards are dropped, so "shards" can be [] when nothing is selected.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TASKS_ROOT="${ROOT}/evals/tasks"
MAX="${EVAL_MAX_TASKS:-0}"
SHARDS="${EVAL_SHARDS:-4}"

[[ "$MAX" =~ ^[0-9]+$ ]] || { echo "EVAL_MAX_TASKS must be a number" >&2; exit 2; }
[[ "$SHARDS" =~ ^[1-9][0-9]*$ ]] || { echo "EVAL_SHARDS must be >= 1" >&2; exit 2; }
command -v jq >/dev/null || { echo "eval-plan: jq is required" >&2; exit 2; }

all_tasks() {
  local dir
  for dir in "$TASKS_ROOT"/*/; do
    if [[ -f "${dir}grade.sh" ]]; then basename "$dir"; fi
  done | sort
}

task_skills() { # $1 = task ; prints skill names, empty when no skills file
  local file="${TASKS_ROOT}/$1/skills"
  [[ -f "$file" ]] || return 0
  grep -v '^#' "$file" | grep -v '^[[:space:]]*$' || true
}

selected=()
if [[ -n "${EVAL_TASKS:-}" ]]; then
  IFS=',' read -r -a requested <<<"${EVAL_TASKS}"
  for t in "${requested[@]}"; do
    t="$(echo "$t" | tr -d '[:space:]')"
    [[ -z "$t" ]] && continue
    [[ -f "${TASKS_ROOT}/${t}/grade.sh" ]] || { echo "eval-plan: unknown task '$t'" >&2; exit 2; }
    selected+=("$t")
  done
elif [[ -n "${EVAL_CHANGED_FILES:-}" ]]; then
  changed_tasks="$(grep -oE '^evals/tasks/[^/]+/' "$EVAL_CHANGED_FILES" | cut -d/ -f3 | sort -u || true)"
  changed_skills="$(grep -oE '^skills/[^/]+/' "$EVAL_CHANGED_FILES" | cut -d/ -f2 | sort -u || true)"
  while IFS= read -r t; do
    pick=0
    grep -qx "$t" <<<"$changed_tasks" && pick=1
    if [[ "$pick" -eq 0 && -n "$changed_skills" ]]; then
      skills="$(task_skills "$t")"
      if [[ -z "$skills" ]]; then
        pick=1
      elif grep -qxF -f <(printf '%s\n' "$changed_skills") <<<"$skills"; then
        pick=1
      fi
    fi
    if [[ "$pick" -eq 1 ]]; then selected+=("$t"); fi
  done < <(all_tasks)
else
  while IFS= read -r t; do selected+=("$t"); done < <(all_tasks)
fi

if [[ "$MAX" -gt 0 && "${#selected[@]}" -gt "$MAX" ]]; then
  selected=("${selected[@]:0:$MAX}")
fi

printf '%s\n' "${selected[@]+"${selected[@]}"}" | jq -R -s -c --argjson n "$SHARDS" '
  split("\n") | map(select(length > 0)) as $t
  | {
      tasks: $t,
      count: ($t | length),
      shards: ([range(0; $n) as $i
        | {id: ($i + 1), tasks: ([$t | to_entries[] | select(.key % $n == $i) | .value] | join(","))}]
        | map(select(.tasks != "")))
    }
'
