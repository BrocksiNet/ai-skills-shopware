#!/usr/bin/env bash
#
# Static validation of every skill. Cheap, deterministic, runs on every PR.
# Wrapper for tools/bin/validate-skills.ts (Node 24+).
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
# Rule IDs:
#   - inline IDs vs rules/catalog.json (also tools/bin/validate-rules.ts)
# Reference routing:
#   - skills/*/routes.json and the generated tables (also tools/bin/validate-routes.ts)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$ROOT/tools/bin/validate-skills.ts" "$@"
