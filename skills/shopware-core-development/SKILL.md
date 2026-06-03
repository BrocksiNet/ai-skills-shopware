---
name: shopware-core-development
description: >-
  Strict rules for contributing to the Shopware core (shopware/shopware) and
  first-party bundles.   Use when working inside the Shopware platform repo:
  release notes (RELEASE_INFO / UPGRADE), ADRs, deprecation handling, @internal
  boundaries, PHPStan baseline discipline, and public-API stability. Triggers on
  "contribute to Shopware core", "add a release note", "add a changelog",
  "deprecate this", "write an ADR", "raise the PHPStan level", "is this a
  breaking change". Do NOT use for plugin/app/
  project development (use shopware-plugin-development) or for generic PHP style
  (use php-foundation).
---

# Shopware core development (strict profile)

For changes that land in `shopware/shopware` itself. This is the strictest
profile: core code is consumed by thousands of plugins, so backward
compatibility, deprecation discipline, and static-analysis hygiene are
mandatory, not optional. Inherits `php-foundation`; adds the deltas below.

Load a reference file only when the task needs it:

- Deprecations & breaking changes -> [`references/deprecations.md`](references/deprecations.md)
- Release notes (RELEASE_INFO / UPGRADE) & ADRs -> [`references/release-notes-and-adr.md`](references/release-notes-and-adr.md)
- PHPStan baseline discipline -> [`references/static-analysis-baseline.md`](references/static-analysis-baseline.md)

## Hard guardrails (refuse rather than violate)

1. **Never raise the PHPStan level without regenerating AND committing the
   baseline in the same change.** Baselines shrink, never grow by deletion. If
   asked to bump the level, do both or stop and explain.
2. **Never remove or change a public (non-`@internal`) symbol without a
   deprecation cycle.** Public API is removed only after it was deprecated in a
   prior minor and announced. If unsure whether something is public, treat it as
   public and check.
3. **Never ship a developer-facing change without a release note.** New
   features, extension points, new guidelines, and deprecations need a
   `RELEASE_INFO-6.x.md` entry; breaking changes need an `UPGRADE-6.x.md` entry.
   (You do NOT hand-write per-change changelog files anymore — the raw changelog
   is generated from PR titles. Internal refactors and small bug fixes need no
   entry.)
4. **Never edit generated files** (e.g. `schema/`, generated entity definitions,
   `vendor/`). Regenerate via the documented command instead.

## Core deltas on top of php-foundation

- **`@internal` discipline.** New classes that are not meant for extension are
  marked `@internal`. Respect existing `@internal` — do not call or extend it
  from outside its bundle.
- **Deprecation, not deletion.** Use `Feature::triggerDeprecationOrThrow()` and
  annotate with `@deprecated tag:v6.x.0 - reason and replacement`. See the
  reference for the exact pattern and the `if (!Feature::isActive(...))` gates.
- **Release notes where they matter.** Add a `RELEASE_INFO-6.x.md` entry for
  developer-facing changes (features, extension points, new best practices,
  deprecations) and an `UPGRADE-6.x.md` entry for breaking changes. Non-critical
  bug fixes and internal refactors need nothing. Add an ADR for architectural
  decisions.
- **Conventional commits**, scoped (e.g. `feat(Checkout): ...`,
  `fix(Administration): ...`).
- **Tests are part of the change**, not a follow-up. Unit + integration where the
  contract requires it (see `shopware-testing`). They must pass before the change
  is done.
- **ECS / PHPStan are the gate.** Run them; do not hand-wave. New code targets the
  repo's configured level with no new baseline entries.

## Definition of done

- [ ] `php-foundation` baseline satisfied (strict types, enums/DTOs, PER-CS).
- [ ] No public-API break without a completed deprecation cycle; `@internal` respected.
- [ ] Deprecations use `Feature::triggerDeprecationOrThrow()` + `@deprecated tag:` annotation.
- [ ] Developer-facing change documented in `RELEASE_INFO-6.x.md`; breaking change in `UPGRADE-6.x.md`; ADR added if the decision is architectural. (Internal refactor / small bug fix: nothing needed.)
- [ ] PHPStan passes with no new baseline entries; if the level changed, the baseline was regenerated and committed.
- [ ] Unit/integration tests added and green; ECS clean; conventional commit message.

## Further reading (optional, non-load-bearing)

- `shopware/shopware` `coding-guidelines/core/`, `adr/`, and `delivery-process/documenting-a-release.md`.
- Shopware developer docs: contribution guidelines, deprecations, backward-compatibility promise.
