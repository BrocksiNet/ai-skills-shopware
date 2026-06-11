---
name: shopware-core-development
description: >-
  Strict rules for changing the Shopware platform itself — code that ships in
  shopware/shopware or first-party bundles. Use when the target is the platform
  source: paths like src/Core, src/Storefront, src/Administration, the
  shopware/shopware repo, or shopware-core Composer packages. Covers backward
  compatibility and deprecation cycles, @internal boundaries, PHPStan baseline
  discipline, RELEASE_INFO / UPGRADE notes, ADRs, and conventional commits.
  Triggers on "contribute to Shopware core", "change platform code", "deprecate
  a public symbol", "add a release note", "write an ADR", "raise the PHPStan
  level", "is this a breaking change". Do NOT use when the target is an
  extension on top of Shopware: a plugin (custom/plugins ->
  shopware-plugin-development), an app (custom/apps, manifest.xml ->
  shopware-app-development), or for generic PHP style (php-foundation).
---

# Shopware platform / core development (strict surface)

For changes that land in the Shopware **platform** itself — `shopware/shopware`,
the `shopware-core` packages, or first-party bundles under `src/`. This is the
strictest surface: platform code is consumed by thousands of plugins and apps,
so backward compatibility, deprecation discipline, and static-analysis hygiene
are mandatory, not optional. Inherits `php-foundation`; adds the deltas below.

> Surface check: this skill is for editing the platform. Building **on top of**
> Shopware is a different surface — a PHP plugin/project (`shopware-plugin-development`)
> or a declarative app (`shopware-app-development`). The right one is usually
> obvious from the path (`src/Core` vs `custom/plugins` vs `custom/apps`).

Load a reference file only when the task needs it:

- Deprecations & breaking changes -> [`references/deprecations.md`](references/deprecations.md)
- Release notes (RELEASE_INFO / UPGRADE) & ADRs -> [`references/release-notes-and-adr.md`](references/release-notes-and-adr.md) (includes migrated `changelog.mdc` detail)
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

- `shopware/shopware`: [coding-guidelines](https://github.com/shopware/shopware/tree/trunk/coding-guidelines),
  [adr/](https://github.com/shopware/shopware/tree/trunk/adr),
  [delivery-process/documenting-a-release.md](https://github.com/shopware/shopware/blob/trunk/delivery-process/documenting-a-release.md),
  and the [Changelog & Release Info Process ADR](https://github.com/shopware/shopware/blob/trunk/adr/2025-10-28-changelog-release-info-process.md).
- Shopware developer docs:
  [Contribution Guidelines](https://developer.shopware.com/docs/resources/guidelines/code/contribution.html)
  and [Backward Compatibility](https://developer.shopware.com/docs/resources/guidelines/code/backward-compatibility.html).
