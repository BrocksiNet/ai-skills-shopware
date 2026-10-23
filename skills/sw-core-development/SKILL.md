---
name: sw-core-development
description: >-
  Use when a shopware/shopware diff touches a public API, a deprecation,
  the PHPStan baseline, or RELEASE_INFO. The question is whether the change
  breaks extensions. A private bugfix in src/Core stays with shopware-php-code
  when that skill is installed. Do NOT use for a plugin
  (sw-plugin-development), an app (sw-app-development), or generic
  PHP style (sw-php-foundation).
license: MIT
metadata:
  contexts: core
  tasks: build review ship
  defers_to: shopware-php-code shopware-release-docs
---

# Shopware platform / core development (strict surface)

For changes that land in the Shopware **platform** itself — `shopware/shopware`,
the `shopware-core` packages, or first-party bundles under `src/`. This is the
strictest surface: platform code is consumed by thousands of plugins and apps,
so backward compatibility, deprecation discipline, and static-analysis hygiene
are mandatory, not optional. Inherits `sw-php-foundation`; adds the deltas below.

> Surface check: this skill is for editing the platform. Building **on top of**
> Shopware is a different surface — a PHP plugin/project (`sw-plugin-development`)
> or a declarative app (`sw-app-development`). The right one is usually
> obvious from the path (`src/Core` vs `custom/plugins` vs `custom/apps`).
> **Upstream (trunk):** If `.agents/skills/shopware-php-code/` exists, prefer it
> for hexagonal layout, migrations, deprecations, and API schema paths. This skill
> keeps PHPStan baseline, release-note guardrails, and eval-linked deltas. Refactor
> decisions → `sw-architecture`.

Read only the reference that matches the task or the files it changes:

<!-- routes:start: generated from routes.json by `node tools/bin/render-routes.ts`; do not edit -->
| Read | When | Or the change touches |
| ---- | ---- | --------------------- |
| [`deprecations.md`](references/deprecations.md) | You deprecate or break a public API. | `@deprecated tag:v`, … |
| [`service-architecture.md`](references/service-architecture.md) | You add a service or change what is public. | `src/**/DependencyInjection/*.{xml,php}`, `src/**/Resources/config/services*.{xml,php}`, `* @(internal\|final)$`, … |
| [`api-schema.md`](references/api-schema.md) | You add or change an Admin or Store API route. | `src/Core/Framework/Api/ApiDefinition/Generator/Schema/**`, `#[Route(` |
| [`modernization-and-flags.md`](references/modernization-and-flags.md) | You modernize code behind a feature flag. | `src/Core/Framework/Resources/config/packages/feature.yaml`, `Feature::isActive(`, … |
| [`release-notes-and-adr.md`](references/release-notes-and-adr.md) | The change needs RELEASE_INFO, UPGRADE or an ADR. | `RELEASE_INFO-*.md`, `UPGRADE-*.md`, … |
| [`static-analysis-baseline.md`](references/static-analysis-baseline.md) | You touch the PHPStan baseline. | `phpstan-baseline.neon`, `phpstan*.neon`, … |
| [`platform-architecture.md`](references/platform-architecture.md) | You cross a bundle boundary or add a listener or migration. | `src/Core/Migration/**/Migration*.php`, `use Shopware\(Storefront\|Administration)\`, … |
| [`removals-and-shims.md`](references/removals-and-shims.md) | You deprecate or remove an API, or add code that only lives until the next major. | `@deprecated tag:v`, … |
| [`bc-data-and-config.md`](references/bc-data-and-config.md) | You change API flags or associations of a definition, a feature flag, a config default or a console command. | `Resources/config/packages/*.yaml`, `feature.yaml`, `new ApiAware(`, … |
| [`platform-scope.md`](references/platform-scope.md) | A change adds an option, an environment probe, or code for one product or hosting setup. | `getenv(`, … |
| [`asset-lifetime.md`](references/asset-lifetime.md) | Code deletes, moves or overwrites theme files, media or thumbnails, or schedules their cleanup. | `UnusedThemeDirectoryDeleter`, … |
<!-- routes:end -->

## Hard guardrails (refuse rather than violate)

1. **CORE-001** **Never raise the PHPStan level without regenerating AND committing the
   baseline in the same change.** Baselines shrink, never grow by deletion. If
   asked to bump the level, do both or stop and explain.
2. **CORE-002** **Never remove or change a public (non-`@internal`) symbol without a
   deprecation cycle.** Public API is removed only after it was deprecated in a
   prior minor and announced. If unsure whether something is public, treat it as
   public and check.
3. **CORE-003** **Never ship a developer-facing change without a release note.** New
   features, extension points, new guidelines, and deprecations need a
   `RELEASE_INFO-6.x.md` entry; breaking changes need an `UPGRADE-6.x.md` entry.
   (You do NOT hand-write per-change changelog files anymore — the raw changelog
   is generated from PR titles. Internal refactors and small bug fixes need no
   entry.)
4. **CORE-004** **Never edit generated files** (e.g. `schema/`, generated entity definitions,
   `vendor/`). Regenerate via the documented command instead.

## Core deltas on top of sw-php-foundation

- **`@internal` discipline.** New classes that are not meant for extension are
  marked `@internal`. Respect existing `@internal` — do not call or extend it
  from outside its bundle.
- **Deprecation, not deletion.** Planned major contract changes use a
  `BCChange` attribute (not `@deprecated reason:*`). Real removals or
  replacements use `@deprecated tag:` plus `Feature::triggerDeprecationOrThrow()`.
  See the reference for `Feature::silent()`, DI service tags, and dual paths.
- **Release notes where they matter.** Add a `RELEASE_INFO-6.x.md` entry for
  developer-facing changes (features, extension points, new best practices,
  deprecations) and an `UPGRADE-6.x.md` entry for breaking changes. Non-critical
  bug fixes and internal refactors need nothing. Add an ADR for architectural
  decisions.
- **CORE-005** **Conventional commits**, scoped (e.g. `feat(Checkout): ...`,
  `fix(Administration): ...`).
- **CORE-006** **Tests are part of the change**, not a follow-up. Unit + integration where the
  contract requires it (see `sw-testing`). They must pass before the change
  is done.
- **ECS / PHPStan are the gate.** Run them; do not hand-wave. New code targets the
  repo's configured level with no new baseline entries.
- **Platform architecture.** Register services in the owning bundle; hexagonal
  services; thin controllers; `@internal` adapters; `@final` where extension is not
  intended. See [`references/service-architecture.md`](references/service-architecture.md)
  and [`references/platform-architecture.md`](references/platform-architecture.md).
- **Core API routes.** New Admin/Store API actions need OpenAPI JSON schemas and
  `ApiRoutesHaveASchemaTest` coverage — see [`references/api-schema.md`](references/api-schema.md).
- **CORE-007** **Modernize, don't fossilize.** When Symfony or a newer platform service fits
  on the pinned stack, adopt it behind `Feature::isActive()` and keep the legacy
  path until the major — see [`references/modernization-and-flags.md`](references/modernization-and-flags.md).

## Definition of done

- [ ] `sw-php-foundation` baseline satisfied (strict types, enums/DTOs, PER-CS).
- [ ] No public-API break without a completed deprecation cycle; `@internal` respected.
- [ ] Planned breaks use `BCChange` attributes; removals/replacements use `@deprecated tag:` + `Feature::triggerDeprecationOrThrow()`; core BC callers use `Feature::silent()` when required.
- [ ] Developer-facing change documented in `RELEASE_INFO-6.x.md`; breaking change in `UPGRADE-6.x.md`; ADR added if the decision is architectural. (Internal refactor / small bug fix: nothing needed.)
- [ ] PHPStan passes with no new baseline entries; if the level changed, the baseline was regenerated and committed.
- [ ] Unit/integration tests added and green; ECS clean; conventional commit message.
- [ ] Services registered in owning bundle; no cross-bundle boundary violations; listeners/controllers follow platform-architecture reference.
- [ ] Internal modernization uses Symfony/platform building blocks behind feature flags when replacing historic workarounds (both paths tested).

## Further reading (optional, non-load-bearing)

- `shopware/shopware`: [coding-guidelines](https://github.com/shopware/shopware/tree/trunk/coding-guidelines),
  [adr/](https://github.com/shopware/shopware/tree/trunk/adr),
  [delivery-process/documenting-a-release.md](https://github.com/shopware/shopware/blob/trunk/delivery-process/documenting-a-release.md),
  and the [Changelog & Release Info Process ADR](https://github.com/shopware/shopware/blob/trunk/adr/2025-10-28-changelog-release-info-process.md).
- Shopware developer docs:
  [Contribution Guidelines](https://developer.shopware.com/docs/resources/guidelines/code/contribution.html)
  and [Backward Compatibility](https://developer.shopware.com/docs/resources/guidelines/code/backward-compatibility.html).

## Already enforced by CI (do not repeat)

<!-- enforced:start: generated from rules/catalog.json by `node tools/bin/render-enforced.ts`; do not edit -->
CI already fails the build on these, so do not repeat them in reviews or
checklists. Flag only what each check misses.
Checks marked *trunk only* are not active in plugin or app projects by
default; there the rule still needs a reviewer.

- `CORE-008` `ApiRoutesHaveASchemaTest` (test, trunk only) fails when a core Store API route has no path in the generated OpenAPI schema, or a schema path has no route. It misses routes of Storefront or plugin controllers, routes marked `openapi: false`, request and response shapes that do not match the code, and Admin API gaps already in its snapshot; flag those.
- `CORE-012` `DeprecatedMethodsThrowDeprecationRule` (PHPStan, trunk only) reports discovery methods such as `getSubscribedEvents()` of a deprecated class that do not return a literal `[]` or `null` when the removal flag is active. It misses discovery methods it does not know, and values computed in other methods; flag those.
- `CORE-013` `NoBCPlanningDeprecationRule` (PHPStan, trunk only) reports `@deprecated` docblocks on classes, methods, properties and constants that contain a `reason:*` planning token. It misses free-text planning notes without those tokens, and docblocks on functions or enum cases; flag those.
- `CORE-015` `BCChangeAttributeUsageRule` (PHPStan, trunk only) reports `BCChange` attributes with a bad version, or that describe a change that is already true or not structurally possible. It misses an attribute that is valid but does not describe the change that is actually planned; flag those.
- `CORE-017` `AnnotationTagTest` (test, trunk only) fails when an `@deprecated` in `src/` or `tests/` lacks a valid `tag:` or `manifest:` version, or names a future version. It misses a missing reason or replacement, and whitelisted paths such as `DevOps/StaticAnalyze`; flag those.
- `CORE-022` `DeprecatedMethodsThrowDeprecationRule` (PHPStan, trunk only) reports public and protected methods of `@deprecated` classes, and `@deprecated` methods, whose body lacks `Feature::triggerDeprecationOrThrow(`. It misses private methods, a wrong flag argument, a call that is commented out, and entity or collection classes; flag those.
- `CORE-037` `MigrationNameAndTimestampTest` (test, trunk only) fails when a core migration class is not named `Migration<digits>…` or `getCreationTimestamp()` differs from those digits. It misses an implausible or out-of-order timestamp, the file name, and the namespace and folder; flag those.
- `CORE-054` `NoFileExistsRule` (PHPStan, trunk only) reports direct `file_exists()` calls. It misses every other raw filesystem function, such as `file_put_contents()`, `unlink()` and `mkdir()`; it does not ask for Symfony `Filesystem`; flag those.
- `CORE-060` `PhpstanBaselineGrowth` (Danger, trunk only) fails a PR that adds net lines to `phpstan-baseline.php`. It misses a swap of one entry for another, inline `@phpstan-ignore`, and PRs labeled `skip-danger-phpstan-baseline`; flag those.
- `CORE-061` `IgnoredPhpstanErrorsInTouchedFiles` (Danger, trunk only) fails a PR that touches a file listed in the PHPStan baseline. It misses inline `@phpstan-ignore` in touched files, and PRs labeled `skip-danger-phpstan-baseline`; flag those.
<!-- enforced:end -->
