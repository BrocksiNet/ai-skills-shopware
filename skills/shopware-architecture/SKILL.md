---
name: shopware-architecture
description: >-
  Use when introducing a new Shopware architecture, or when a change can
  break an existing one without the diff saying so. That includes a new
  extension structure, a boundary between Core and Storefront or
  Administration, a second path that fails silently for callers on the old
  one, an event versus a decoration versus a core edit, and a repository
  search with no limit. Do NOT use to write the ADR or RELEASE_INFO
  (shopware-core-development), for route privileges (shopware-security),
  or for a private bugfix with one obvious edit (shopware-php-code or
  shopware-plugin-development).
license: MIT
---

# Shopware architecture (patterns + evolution)

Decision guide for **how** to structure Shopware PHP — not lint-level style.
Use when a task is about refactors, boundaries, DAL usage, Symfony placement,
or rolling out new behaviour without breaking plugins.

> **Upstream (trunk):** If `.agents/skills/shopware-php-code/` exists in the
> workspace, prefer it for hexagonal layout, `@internal`, DTO conservatism, and
> migration timestamps. This skill adds **decision trees**, **anti-patterns**,
> and **progressive enhancement** playbooks.

Read only the reference that matches the task or the files it changes:

<!-- routes:start: generated from routes.json by `node tools/bin/render-routes.ts`; do not edit -->
| Read | When | Or the change touches |
| ---- | ---- | --------------------- |
| [`progressive-enhancement.md`](references/progressive-enhancement.md) | A change must roll out without breaking existing callers. | `Feature::isActive(`, … |
| [`component-independence.md`](references/component-independence.md) | A change couples two components or bundles. | `use Shopware\(Storefront\|Administration\|Elasticsearch)\` |
| [`dal-contracts.md`](references/dal-contracts.md) | You touch a DAL definition, entity or repository contract. | `*Definition.php`, `*EntityExtension.php`, `extends (Entity\|EntityTranslation\|MappingEntity)Definition`, … |
| [`symfony-in-shopware.md`](references/symfony-in-shopware.md) | You reach for a Symfony component or container feature. | `HttpClientInterface`, … |
| [`extension-mechanisms.md`](references/extension-mechanisms.md) | You choose between an event, a decoration and a core edit. | `Resources/config/services.{xml,php}`, `decorates`, … |
| [`anti-patterns.md`](references/anti-patterns.md) | You check a design against known mistakes. | `vendor/shopware/**`, `Doctrine\DBAL\Connection`, … |
| [`pattern-catalog.md`](references/pattern-catalog.md) | You need an established pattern or want to propose one. | `[ (!]time()`, … |
<!-- routes:end -->

## Decision flow (start here)

1. **Surface** — core platform (`shopware-core-development`), plugin/project
   (`shopware-plugin-development`), or app (`shopware-app-development`)?
2. **Public API touched?** — If yes, deprecation cycle + release docs; if no,
   prefer internal swap behind a narrow interface.
3. **Extension mechanism** — event vs decoration vs entity extension vs new route
   (see reference).
4. **Progressive enhancement** — new path behind `Feature::isActive()`; keep
   legacy path until major; test both (see reference).
5. **Scope** — smallest root-cause change; grep callers before shared behaviour
   edits (`shopware-review-learnings` → change-scope when present).

## Hard guardrails

1. **Never unbounded DAL reads** on large entities — always `setLimit` / pagination
   unless a documented admin/export exception.
2. **Never use Doctrine `Connection` for entity CRUD** when `EntityRepository` +
   `Criteria` express the query.
3. **Never import Storefront/Administration from Core** (or core/vendor from plugins).
4. **Never silent behaviour change** on paths extensions observe — flag, release
   note, or explicit BC branch.

## Definition of done

- [ ] Correct extension mechanism chosen; dependencies flow inward (Core ← bundles).
- [ ] DAL reads bounded; repositories used for entity data.
- [ ] Refactors that change behaviour use progressive enhancement (flag + legacy path) on core.
- [ ] Large decoupling split into phased PRs when needed; ADR for architectural forks.

## Further reading

- Core trunk skills: `.agents/skills/shopware-php-code`, `shopware-change-scope`
- Install profiles: [`docs/skill-resolution.md`](../../docs/skill-resolution.md)
