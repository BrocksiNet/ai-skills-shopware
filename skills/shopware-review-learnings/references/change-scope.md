# Change scope and boyscouting

Load when fixing a bug, applying review feedback, or deciding how much cleanup
belongs in the same PR.

## Bug fixes

1. Treat issue descriptions and suggested fixes as **hypotheses** — verify against
   the codebase.
2. **Grep callers and sibling paths** before editing shared behavior.
3. Fix the boundary where the bug **actually lives** — framework bugs in framework
   code; feature-specific bugs out of broad framework paths.
4. Find the **smallest root-cause fix** that addresses the reported behavior.

## Boyscouting

- Apply the **same safe cleanup across the touched file** when it is obvious
  (naming, imports, dead code) — do not leave inconsistent style next to your edit.
- **Mention** nearby broader cleanup opportunities in the PR or review reply
  instead of silently expanding scope.
- When touching tests, add **cheap missing coverage** in the same command/domain
  surface when it is clearly related.
- Do **not** turn a focused fix into an unrelated refactor or cross-module sweep.

## PR size pairing

Pair with `shopware-pr-description`: if boyscouting would push the diff past
~400 lines, stop and propose a follow-up PR.
