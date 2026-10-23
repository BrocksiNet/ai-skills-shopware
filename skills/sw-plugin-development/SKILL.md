---
name: sw-plugin-development
description: >-
  Extend Shopware 6 with PHP plugins and a shop project's own backend code.
  Use when the target lives on top of the platform: custom/plugins,
  custom/static-plugins, vendor/store.shopware.com, a standalone plugin repo
  (a class extending Shopware\Core\Framework\Plugin\Plugin), or project src/
  services. Covers services and DI (PHP on 6.8, XML on 6.6/6.7, migrating
  services.xml to PHP), DAL queries, HTTP cache tags, migrations, decorating
  core services, Symfony HttpClient, and 6.6 to 6.8 compatibility. Do NOT use
  for the platform itself (sw-core-development), for declarative apps
  with a manifest.xml (sw-app-development), generic PHP style
  (sw-php-foundation), or test authoring (sw-testing).
license: MIT
metadata:
  contexts: plugin project
  tasks: build review
---

# Shopware plugin / project development (pragmatic surface)

For PHP that runs *on top of* Shopware — plugins (`custom/plugins`,
`custom/static-plugins`, `vendor/store.shopware.com`, a standalone plugin repo)
and a shop project's own backend code. The goal is the **smallest coherent,
safe change** that fits Shopware's extension model — not re-architecting, and
not defensive ceremony without a concrete failure mode. Inherits
`sw-php-foundation`; adds the deltas below.

> Surface check: this skill is for PHP extensions. Editing the platform itself
> is `sw-core-development`; a **declarative app** (`manifest.xml` under
> `custom/apps`, app scripts, webhooks) is `sw-app-development` — apps have
> no plugin DI/DAL at runtime, so do not apply these rules there.

Read only the reference that matches the task or the files it changes:

<!-- routes:start: generated from routes.json by `node tools/bin/render-routes.ts`; do not edit -->
| Read | When | Or the change touches |
| ---- | ---- | --------------------- |
| [`dal-usage.md`](references/dal-usage.md) | You read or write data through the DAL. | `*Definition.php`, `*Entity.php`, `new Criteria(`, … |
| [`api-contracts.md`](references/api-contracts.md) | You add or change a Store-API or Admin route, its response struct, or its OpenAPI schema. | `StoreApi/**/*.php`, `Resources/Schema/**`, `#[Route(`, … |
| [`cache-tags.md`](references/cache-tags.md) | A change affects cached pages or needs cache tags (6.7+). | `CacheTagCollector`, … |
| [`migrations.md`](references/migrations.md) | You add or change a database migration. | `Migration/Migration*.php`, `extends MigrationStep`, … |
| [`version-compatibility.md`](references/version-compatibility.md) | The plugin must support more than one Shopware minor, or runs without a package it only suggests. | `composer.json`, `Resources/config/services.xml`, `"shopware/core"`, … |
| [`symfony-first.md`](references/symfony-first.md) | You are about to write code a Symfony component already provides. | `file_put_contents(`, … |
<!-- routes:end -->

- Architecture choices (events vs decoration) -> `sw-architecture`

## Hard guardrails (refuse rather than violate)

1. **Never break Shopware 6.6 compatibility silently** (`PLG-001`). If the project
   supports 6.6 and your change uses 6.7-only API, gate it or flag the bump
   explicitly; see [`version-compatibility.md`](references/version-compatibility.md).
2. **PLG-002** **Never use a deprecated API when a stable replacement exists** (e.g. the
   `*CacheTagsEvent` events in 6.7 — use `CacheTagCollector`). If you must, say so
   and why.
3. **Never write raw SQL through the DAL layer for entity data** when a `Criteria`
   read or `EntityRepository` write works. Raw connection SQL is a last resort
   with a stated reason (bulk/performance) and parameter binding.
4. **PLG-004** **Never modify core files or vendor code.** Extend via decoration, events,
   and the extension system.

## Plugin deltas on top of sw-php-foundation

Inherits all **`sw-php-foundation` trunk habits** (`empty()`, interface injection,
`ClockInterface`, typing). Also:

- **PLG-005** **Extend, do not modify.** Use service **decoration** (`decorates:`), event
  **subscribers/listeners**, and the entity-extension / custom-field system.
  Register new services in PHP (`services.php` with `ContainerConfigurator`)
  when the plugin targets 6.8+. XML `services.xml` / `routes.xml` still load
  on 6.6/6.7; migrate them before 6.8. Keep plugin `config.xml` as XML.
- **PLG-006** **Thin controllers** — delegate to services; see `sw-architecture` and
  `sw-review-learnings`. New Store-API routes need OpenAPI (see
  `api-contracts.md`) and ACL (`sw-security`).
- **DAL first.** Read with `Criteria` (add associations before filtering on them;
  avoid N+1; request only the fields/associations you need). Write with
  `EntityRepository::create/update/upsert` and the right `Context`.
- **Cache (6.7+).** Inject `CacheTagCollector` and call `addTag()` (6.7.2+;
  dispatch `AddCacheTagEvent` for 6.7.0 and 6.7.1); invalidate
  with `CacheInvalidator::invalidate()`. Do not subscribe to deprecated
  `*CacheTagsEvent`.
- **Migrations** extend `MigrationStep`; separate destructive from
  non-destructive; make them idempotent; never edit a shipped migration after
  release.
- **PLG-008** **Plugin lifecycle:** handle install/update/activate/deactivate/uninstall;
  respect `keepUserData` on uninstall; clean up only what you own.
- **PLG-009** **Version awareness:** check the supported Shopware range in `composer.json`,
  keep code working across it, and align Symfony usage to the version that range
  pins. Prefer Symfony components over custom HTTP/time/validation when the pinned
  stack allows ([`references/symfony-first.md`](references/symfony-first.md)).
  For cross-version migrations and modernization, reach for **Rector**
  (`frosh/shopware-rector` set) and review the dry-run — do not hand-edit blindly
  (see the compatibility reference).
- **PLG-010** **Preparing for 6.8 is not a rewrite onto 6.8-only APIs.** Keep the
  `composer.json` range unless the user asked to drop a minor. Run the suite
  as it is, and again with `V6_8_0_0=1`. `FEATURE_ALL` is not that run. Code
  that still compiles can still be wrong (cache, cart cents, documents, flows).
  The separate container behind that flag is a test switch, not a design to
  ship. Details are in the compatibility reference.

## Definition of done

- [ ] `sw-php-foundation` baseline satisfied (strict types, enums/DTOs, PER-CS).
- [ ] No core/vendor modification; extension done via decoration/events/extensions.
- [ ] DAL used for entity data; associations added before filtering; no obvious N+1.
- [ ] No deprecated API where a stable one exists; 6.6 compat preserved or the bump flagged.
- [ ] 6.8 preparation kept the supported range, and named behavior that still compiles.
- [ ] 6.8-targeted plugins register Symfony DI in PHP, not `services.xml`.
- [ ] Migrations idempotent and split destructive/non-destructive; lifecycle handled.
- [ ] Static analysis (project PHPStan/ECS) passes; tests added where behavior changed (see sw-testing).
- [ ] Custom HTTP/time/queue/validation justified, or replaced with Symfony on the pinned version; platform APIs used for DAL/cache/routes.

## Further reading (optional, non-load-bearing)

- Shopware developer docs:
  [Plugin guides](https://developer.shopware.com/docs/guides/plugins/plugins/),
  [Data Abstraction Layer](https://developer.shopware.com/docs/concepts/framework/data-abstraction-layer.html)
  ([reading data](https://developer.shopware.com/docs/guides/plugins/plugins/framework/data-handling/reading-data.html)),
  [Migrations](https://developer.shopware.com/docs/concepts/framework/migrations.html).
- brocksi.net: API-aware guidelines; 6.7 cache tags migration guide.

## Already enforced by CI (do not repeat)

<!-- enforced:start: generated from rules/catalog.json by `node tools/bin/render-enforced.ts`; do not edit -->
CI already fails the build on these, so do not repeat them in reviews or
checklists. Flag only what each check misses.

- `PLG-002` `phpstan/phpstan-deprecation-rules` (PHPStan) reports uses of `@deprecated` classes and methods, such as a subscriber for a `*CacheTagsEvent`, when the plugin installs it. It misses projects that do not install it, and deprecations announced only in UPGRADE notes; flag those.
<!-- enforced:end -->
