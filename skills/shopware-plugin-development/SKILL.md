---
name: shopware-plugin-development
description: >-
  Pragmatic rules for extending Shopware 6 with PHP — plugins and a shop
  project's own backend code. Use when the target lives on top of the platform:
  paths like custom/plugins, custom/static-plugins, vendor/store.shopware.com, a
  standalone plugin repo (a class extending Shopware\Core\Framework\Plugin\Plugin),
  or project src/ services. Covers services and DI, DAL reads/writes, HTTP cache
  tags (6.7+), database migrations, event subscribers, decoration, and 6.6/6.7
  compatibility. Triggers on "build a Shopware plugin", "add a service", "query
  with the DAL", "add a migration", "cache this route", "decorate a core
  service", "subscribe to an event", "make this 6.7 compatible", "use Symfony
  HttpClient", "replace custom HTTP with Symfony". Do NOT use for
  the platform itself (shopware-core-development), for declarative apps with a
  manifest.xml (shopware-app-development), generic PHP style (php-foundation),
  or test authoring (shopware-testing).
---

# Shopware plugin / project development (pragmatic surface)

For PHP that runs *on top of* Shopware — plugins (`custom/plugins`,
`custom/static-plugins`, `vendor/store.shopware.com`, a standalone plugin repo)
and a shop project's own backend code. The goal is the **smallest coherent,
safe change** that fits Shopware's extension model — not re-architecting, and
not defensive ceremony without a concrete failure mode. Inherits
`php-foundation`; adds the deltas below.

> Surface check: this skill is for PHP extensions. Editing the platform itself
> is `shopware-core-development`; a **declarative app** (`manifest.xml` under
> `custom/apps`, app scripts, webhooks) is `shopware-app-development` — apps have
> no plugin DI/DAL at runtime, so do not apply these rules there.

Load a reference only when the task needs it:

- DAL reads/writes -> [`references/dal-usage.md`](references/dal-usage.md)
- Store-API / Admin OpenAPI & headless -> [`references/api-contracts.md`](references/api-contracts.md)
- HTTP cache tags (6.7+) -> [`references/cache-tags.md`](references/cache-tags.md)
- Database migrations -> [`references/migrations.md`](references/migrations.md)
- 6.6 / 6.7 compatibility -> [`references/version-compatibility.md`](references/version-compatibility.md)
- Symfony-first (prefer components over custom code) -> [`references/symfony-first.md`](references/symfony-first.md)
- Architecture choices (events vs decoration) -> `shopware-architecture`

## Hard guardrails (refuse rather than violate)

1. **Never break Shopware 6.6 compatibility silently.** If the project supports
   6.6 and your change uses 6.7-only API, gate it or flag the bump explicitly.
2. **Never use a deprecated API when a stable replacement exists** (e.g. the
   `*CacheTagsEvent` events in 6.7 — use `CacheTagCollector`). If you must, say so
   and why.
3. **Never write raw SQL through the DAL layer for entity data** when a `Criteria`
   read or `EntityRepository` write works. Raw connection SQL is a last resort
   with a stated reason (bulk/performance) and parameter binding.
4. **Never modify core files or vendor code.** Extend via decoration, events,
   and the extension system.

## Plugin deltas on top of php-foundation

Inherits all **`php-foundation` trunk habits** (`empty()`, interface injection,
`ClockInterface`, typing). Also:

- **Extend, do not modify.** Use service **decoration** (`decorates:`), event
  **subscribers/listeners**, and the entity-extension / custom-field system.
  Register services in `services.xml`/`services.yaml` with explicit ids.
- **Thin controllers** — delegate to services; see `shopware-architecture` and
  `shopware-review-learnings`. New Store-API routes need OpenAPI (see
  `api-contracts.md`) and ACL (`shopware-security`).
- **DAL first.** Read with `Criteria` (add associations before filtering on them;
  avoid N+1; request only the fields/associations you need). Write with
  `EntityRepository::create/update/upsert` and the right `Context`.
- **Cache (6.7+).** Inject `CacheTagCollector` and call `addTag()`; invalidate
  with `CacheInvalidator::invalidate()`. Do not subscribe to deprecated
  `*CacheTagsEvent`.
- **Migrations** extend `MigrationStep`; separate destructive from
  non-destructive; make them idempotent; never edit a shipped migration after
  release.
- **Plugin lifecycle:** handle install/update/activate/deactivate/uninstall;
  respect `keepUserData` on uninstall; clean up only what you own.
- **Version awareness:** check the supported Shopware range in `composer.json`,
  keep code working across it, and align Symfony usage to the version that range
  pins. Prefer Symfony components over custom HTTP/time/validation when the pinned
  stack allows ([`references/symfony-first.md`](references/symfony-first.md)).
  For cross-version migrations and modernization, reach for **Rector**
  (`frosh/shopware-rector` set) and review the dry-run — do not hand-edit blindly
  (see the compatibility reference).

## Definition of done

- [ ] `php-foundation` baseline satisfied (strict types, enums/DTOs, PER-CS).
- [ ] No core/vendor modification; extension done via decoration/events/extensions.
- [ ] DAL used for entity data; associations added before filtering; no obvious N+1.
- [ ] No deprecated API where a stable one exists; 6.6 compat preserved or the bump flagged.
- [ ] Migrations idempotent and split destructive/non-destructive; lifecycle handled.
- [ ] Static analysis (project PHPStan/ECS) passes; tests added where behavior changed (see shopware-testing).
- [ ] Custom HTTP/time/queue/validation justified, or replaced with Symfony on the pinned version; platform APIs used for DAL/cache/routes.

## Further reading (optional, non-load-bearing)

- Shopware developer docs:
  [Plugin guides](https://developer.shopware.com/docs/guides/plugins/plugins/),
  [Data Abstraction Layer](https://developer.shopware.com/docs/concepts/framework/data-abstraction-layer.html)
  ([reading data](https://developer.shopware.com/docs/guides/plugins/plugins/framework/data-handling/reading-data.html)),
  [Migrations](https://developer.shopware.com/docs/concepts/framework/migrations.html).
- brocksi.net: API-aware guidelines; 6.7 cache tags migration guide.
