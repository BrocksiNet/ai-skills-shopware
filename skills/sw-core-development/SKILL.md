---
name: sw-core-development
description: >-
  Rules for changing shopware/shopware core that only core review knows. Load
  before any edit on core trunk (src/Core, src/Storefront, src/Administration,
  src/Elasticsearch): migrations, Store API routes, public APIs, deprecations,
  feature flags, PHPStan baseline, or RELEASE_INFO. Do NOT use for plugins
  (sw-plugin-development), apps (sw-app-development), or generic PHP
  (sw-php-foundation).
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
| [`api-schema.md`](references/api-schema.md) | You add or change an Admin or Store API route. | `ApiDefinition/Generator/Schema/**`, `#[Route(` |
| [`modernization-and-flags.md`](references/modernization-and-flags.md) | You modernize an implementation and choose whether compatibility needs a feature flag. | `feature.yaml`, `Feature::isActive(`, `HttpClientInterface` |
| [`release-notes-and-adr.md`](references/release-notes-and-adr.md) | The change needs RELEASE_INFO, UPGRADE or an ADR. | `RELEASE_INFO-*.md`, `UPGRADE-*.md`, … |
| [`static-analysis-baseline.md`](references/static-analysis-baseline.md) | You touch the PHPStan baseline or suppress a PHPStan error. | `phpstan-baseline.neon`, `phpstan*.neon`, `@phpstan-ignore`, … |
| [`platform-architecture.md`](references/platform-architecture.md) | You cross a bundle boundary or add a listener or migration. | `src/Core/Migration/**/Migration*.php`, `use Shopware\(Storefront\|Administration)\`, … |
| [`removals-and-shims.md`](references/removals-and-shims.md) | You deprecate or remove an API, or add code that only lives until the next major. | `@deprecated tag:v`, … |
| [`bc-data-and-config.md`](references/bc-data-and-config.md) | You change API flags or associations of a definition, a feature flag, a config default or a console command. | `Resources/config/packages/*.yaml`, `feature.yaml`, `new ApiAware(`, … |
| [`platform-scope.md`](references/platform-scope.md) | A change adds an option, an environment probe, or code for one product or hosting setup. | `getenv(`, … |
| [`asset-lifetime.md`](references/asset-lifetime.md) | Code deletes, moves or overwrites theme files, media or thumbnails, or schedules their cleanup. | `UnusedThemeDirectoryDeleter`, … |
<!-- routes:end -->

## Hard guardrails (refuse rather than violate)

1. **CORE-002** **Never remove or change a public (non-`@internal`) symbol without a
   deprecation cycle.** Public API is removed only after it was deprecated in a
   prior minor and announced. If unsure whether something is public, treat it as
   public and check.
2. **CORE-003** **Never ship a developer-facing change without a release note.** New
   features, extension points, new guidelines, and deprecations need a
   `RELEASE_INFO-6.x.md` entry; breaking changes need an `UPGRADE-6.x.md` entry.
   (You do NOT hand-write per-change changelog files anymore — the raw changelog
   is generated from PR titles. Internal refactors and small bug fixes need no
   entry.)
3. **CORE-004** **Never edit generated files** (e.g. `schema/`, generated entity definitions,
   `vendor/`). Regenerate via the documented command instead.

## Core deltas on top of sw-php-foundation

- **The trunk PHP baseline applies to every line you touch.** No `empty()`
  (`PHP-001`; PHPStan rejects it on trunk) and a backed `enum` for a fixed set
  of values in new code (`PHP-002`). The rest of the baseline is in
  `sw-php-foundation`.
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

## Definition of done

- [ ] `sw-php-foundation` baseline satisfied (strict types, enums/DTOs, PER-CS).
- [ ] No public-API break without a completed deprecation cycle; `@internal` respected.
- [ ] Planned breaks use `BCChange` attributes; removals/replacements use `@deprecated tag:` + `Feature::triggerDeprecationOrThrow()`; core BC callers use `Feature::silent()` when required.
- [ ] Developer-facing change documented in `RELEASE_INFO-6.x.md`; breaking change in `UPGRADE-6.x.md`; ADR added if the decision is architectural. (Internal refactor / small bug fix: nothing needed.)
- [ ] PHPStan passes with no new baseline entries; if the level changed, the baseline was regenerated and committed.
- [ ] Unit/integration tests added and green; ECS clean; conventional commit message.
- [ ] Services registered in owning bundle; no cross-bundle boundary violations; listeners/controllers follow platform-architecture reference.
- [ ] Internal modernization uses Symfony/platform building blocks; equivalent swaps replace code directly, while incompatible changes or staged rollouts retain and test the required legacy path.

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
CI already fails the build on 11 checks for this skill's rules. Before you
flag a finding or write a checklist, read [`references/enforced-by-ci.md`](references/enforced-by-ci.md)
and flag only what each check misses.
<!-- enforced:end -->
