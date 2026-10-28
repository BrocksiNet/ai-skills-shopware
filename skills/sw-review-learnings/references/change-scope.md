# Change scope and boyscouting

Load when fixing a bug, applying review feedback, or deciding how much cleanup
belongs in the same PR.

## Bug fixes

1. **REV-026** **Grep callers and sibling paths** before editing shared behavior.

## Boyscouting

- **REV-029** Apply the **same safe cleanup across the touched file** when it is obvious
  (naming, imports, dead code) — do not leave inconsistent style next to your edit.
- **REV-030** **Mention** nearby broader cleanup opportunities in the PR or review reply
  instead of silently expanding scope.
- **REV-031** When touching tests, add **cheap missing coverage** in the same command/domain
  surface when it is clearly related.
- **REV-032** Do **not** turn a focused fix into an unrelated refactor or cross-module sweep.

## PR size pairing

Pair with `sw-pr-description`: if boyscouting would push the diff past
~400 lines, stop and propose a follow-up PR.
