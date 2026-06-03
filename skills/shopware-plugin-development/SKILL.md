---
name: shopware-plugin-development
description: >-
  Pragmatic rules for building Shopware 6 plugins, apps, and project code. Use
  when creating or changing a plugin/app: services and DI, DAL reads/writes,
  HTTP cache tags (6.7+), database migrations, event subscribers, decoration,
  and 6.6/6.7 version compatibility. Triggers on "build a Shopware plugin",
  "add a service", "query with the DAL", "add a migration", "cache this route",
  "subscribe to an event", "make this 6.7 compatible". Do NOT use for
  shopware/shopware core contributions (use shopware-core-development), generic
  PHP style (use php-foundation), or test authoring (use shopware-testing).
---

# Shopware plugin development (pragmatic profile)

For plugins, apps, and customer-project code that runs *on top of* Shopware.
The goal is the **smallest coherent, safe change** that fits Shopware's
extension model — not re-architecting, and not defensive ceremony without a
concrete failure mode. Inherits `php-foundation`; adds the deltas below.

Load a reference only when the task needs it:

- DAL reads/writes -> [`references/dal-usage.md`](references/dal-usage.md)
- HTTP cache tags (6.7+) -> [`references/cache-tags.md`](references/cache-tags.md)
- Database migrations -> [`references/migrations.md`](references/migrations.md)
- 6.6 / 6.7 compatibility -> [`references/version-compatibility.md`](references/version-compatibility.md)

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

- **Extend, do not modify.** Use service **decoration** (`decorates:`), event
  **subscribers**, and the entity-extension / custom-field system. Register
  services in `services.xml`/`services.yaml` with explicit ids.
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
- **Version awareness:** check the supported Shopware range in `composer.json`
  and keep the code working across it (see the compatibility reference).

## Definition of done

- [ ] `php-foundation` baseline satisfied (strict types, enums/DTOs, PER-CS).
- [ ] No core/vendor modification; extension done via decoration/events/extensions.
- [ ] DAL used for entity data; associations added before filtering; no obvious N+1.
- [ ] No deprecated API where a stable one exists; 6.6 compat preserved or the bump flagged.
- [ ] Migrations idempotent and split destructive/non-destructive; lifecycle handled.
- [ ] Static analysis (project PHPStan/ECS) passes; tests added where behavior changed (see shopware-testing).

## Further reading (optional, non-load-bearing)

- Shopware developer docs: plugin fundamentals, DAL, HTTP cache, migrations.
- brocksi.net: API-aware guidelines; 6.7 cache tags migration guide.
