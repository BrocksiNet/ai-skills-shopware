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

Read only the reference that matches the task:

- Read [`references/progressive-enhancement.md`](references/progressive-enhancement.md) when a change must roll out without breaking existing callers.
- Read [`references/component-independence.md`](references/component-independence.md) when a change couples two components or bundles.
- Read [`references/dal-contracts.md`](references/dal-contracts.md) when you touch a DAL definition, entity or repository contract.
- Read [`references/symfony-in-shopware.md`](references/symfony-in-shopware.md) when you reach for a Symfony component or container feature.
- Read [`references/extension-mechanisms.md`](references/extension-mechanisms.md) when you choose between an event, a decoration and a core edit.
- Read [`references/anti-patterns.md`](references/anti-patterns.md) when you check a design against known mistakes.
- Read [`references/pattern-catalog.md`](references/pattern-catalog.md) when you need an established pattern or want to propose one.

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
