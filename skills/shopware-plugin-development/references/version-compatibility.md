# Shopware 6.6 / 6.7 / 6.8 compatibility

Load this when a plugin must support more than one Shopware minor, or when you
introduce API that only exists in one of them.

## First: know the supported range

Check `composer.json` `require` for `shopware/core` (e.g. `~6.6.0 || ~6.7.0`).
That range is the contract. Your change must keep working across all of it, or
you must consciously narrow the range and call it out.

## Guarding version-specific code

When an API exists only in 6.7 (e.g. `CacheTagCollector`) but you still support
6.6:

- Prefer requiring 6.7+ and bumping `composer.json` *if* the project allows it —
  and state the bump explicitly.
- Otherwise gate at runtime. Use capability checks (class/method/service exists)
  rather than version-string parsing where possible:

```php
if (class_exists(CacheTagCollector::class)) {
    // 6.7+ path
} else {
    // 6.6 fallback
}
```

- Keep both paths covered by tests, or at least smoke-checked, until you drop the
  old minor.

**Do not add `class_exists` for core framework classes that already exist in your
minimum supported version.** `Feature`, `Context`, `Criteria`, `EntityRepository`,
`Kernel` — all present since 6.4/6.5. Check the class's first-ship version before
adding a guard; a guard for a class that always exists is dead code that misleads
readers about the supported range.

## Shopware feature flags

Shopware ships experimental and in-progress API behind `Feature` flags
(`\Shopware\Core\Framework\Feature`). The right pattern when calling
`Feature::isActive()` from plugin code:

```php
use Shopware\Core\Framework\Feature;

// Safe: only call isActive() when the flag is registered, avoiding E_USER_WARNING
// on Shopware builds that don't know the flag (e.g. older minors in test env).
// !Feature::has() means the flag was removed (graduated to always-on) — assume available.
return !Feature::has('MY_FLAG') || Feature::isActive('MY_FLAG');
```

- **Never read `$_SERVER['MY_FLAG']` or `getenv('MY_FLAG')` directly** — that
  bypasses Shopware's feature registry, breaks in prod mode, and reviewers will
  flag it.
- `Feature::has()` returns false when the flag is not registered (e.g. it was
  removed after graduating). The pattern above treats graduation as "always active",
  which is correct — the feature is stable.
- In tests that stub a class guarded by a flag, set `$_SERVER['MY_FLAG'] = '1'` in
  `setUpBeforeClass()` (and `unset` in `tearDownAfterClass()`) so
  `Feature::isActive()` returns true without needing a full Shopware kernel boot.
  On builds where the flag is not registered, `Feature::has()` returns false and
  the test path is reached without the `isActive()` call anyway.

## Deprecations you will meet

6.7 deprecated and stopped dispatching the `*CacheTagsEvent` events (removed in
6.8). Treat any 6.6-era pattern that the 6.7 upgrade guide flags as a migration
target, not something to copy.

## Symfony XML configuration (gone in 6.8)

Shopware 6.7 deprecates loading Symfony DI / routing / package config from XML
for plugins; **6.8 removes it** (Symfony 8 drops the XML loaders).

- **In scope to migrate:** `src/Resources/config/services.xml`,
  `services_test.xml`, `routes.xml`, `routes_<env>.xml`, and
  `packages/**/*.xml`. Replace them with PHP `ContainerConfigurator` files
  (`services.php`, `routes.php`).
- **Leave as XML:** plugin admin settings `config.xml`, `custom-fields.xml`,
  `flow.xml`, `rule-conditions.xml`, and app `manifest.xml`.
- A 6.6/6.7 plugin may still ship XML DI. A **6.8-targeted** plugin must not.
  Do not add new `services.xml` when the supported range includes 6.8.

```php
use SwagExample\ProductLoader;
use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;

return static function (ContainerConfigurator $container): void {
    $container->services()
        ->set(ProductLoader::class)
        ->autowire()
        ->autoconfigure();
};
```

## Symfony version alignment

Each Shopware minor pins a Symfony major (roughly: 6.6 → Symfony 6.4 LTS, 6.7 →
Symfony 7.x — confirm against `composer.lock`, do not assume). Do **not** use a
Symfony API newer than the version your supported Shopware range ships; the
installed Symfony is the contract, not the latest Symfony docs. See
[`symfony-first.md`](symfony-first.md) for preferring Symfony components in
**plugin** code; core modernization uses feature flags
([`modernization-and-flags.md`](../../shopware-core-development/references/modernization-and-flags.md)).

## Preparing for 6.8 without dropping the versions you support

The 6.8 scope is not frozen (fixed around the end of 2026, release targeted
for mid-2027). Do not treat a slide deck as the migration. Do not narrow
`composer.json` to 6.8 unless the user asked to drop a minor. Polyfills and
version-aware Rector sets are proposals, not a finished upgrade. Prefer
deprecation warnings and Shopware's future-compatibility rules when they
exist on the version you run. Do not transcribe them here.

What you can already check:

- PHP 8.5 is usable on 6.7.6.0 and 6.6.10.11. In 6.8 the temporary fallback
  for invalid locales goes away, so number formatting needs a valid locale.
- MySQL 8.4 and MariaDB 11.4 are already supported. Foreign keys must
  reference a complete primary or unique key.
- Symfony 8 removes XML service and route config (already covered above) and
  dynamic `$request->get()`. Read query, body, or route attributes. Mixed
  GET/POST goes through Shopware's `RequestParamHelper`.

How to test, on a shop that still supports the current minor:

- Keep the normal suite. Add a second run with `V6_8_0_0=1`.
- `FEATURE_ALL` enables later flags as well. It is not the 6.8 run.
- An explicit feature override can leave a linked flag (such as
  `CACHE_REWORK`) off even when the major flag is on.
- From 6.7.16, that flag is planned to select a **separate compiled
  container** so removed services fail in the test. That is how you find
  removals. It is not a container your plugin should ship. A production
  split is `shopware-change-impact`.

Behavior that still compiles. Enable the matching flag in a test environment
and compare results. Confirm against the Shopware version you actually run:

- **`CACHE_REWORK`.** HTTP cache stays on for logged-in customers and filled
  carts. Selected Store API GET routes share it. Only cache-relevant rules
  vary it by default. Test personalized content, custom rules, and
  invalidation across customers and cart states.
- **Cart calculation.** Percentage discounts, surcharges, and split quantities
  reuse the taxes already calculated for the line item. Cent amounts can
  change. Compare what you send to ERP and accounting, including mixed tax
  rates and net/gross prices.
- **`DOCUMENT_GENERATION_REWORK`.** v2 becomes the default in 6.8. v1 remains
  a fallback until 6.9. Types and formats have separate extension points.
  Existing Twig document templates stay. PHP that hooks the old generator
  moves to the new extension points.
- **`FLOW_EXECUTION_AFTER_BUSINESS_PROCESS`.** Flows run after the request,
  message, or command finishes its main work, still in the same process. The
  operation can return before a flow action (such as mail) has run. A failing
  flow must not be what completes checkout. Transaction-critical work stays
  in a synchronous subscriber.

Storefront Twig 4 (`spaceless`, macro defaults, `null` HTML attributes) is
`shopware-storefront`. An Administration Twig override is not migrated to the
experimental Vue single-file API for this upgrade; that refusal is
`shopware-admin-js`.

## Upgrades & modernization (tooling, not hand-edits)

For cross-version migrations (e.g. 6.6 → 6.7) and PHP modernization, prefer
**Rector** over hand-editing — it is Shopware's own recommended upgrade tool:

- Add `rector/rector` + `frosh/shopware-rector` (`--dev`) and pick the matching
  set, e.g. `Frosh\Rector\Set\ShopwareSetList::SHOPWARE_6_7_0`, alongside the
  Symfony set for language/framework modernization.
- Run **dry-run first** (`vendor/bin/rector process --dry-run`), **review the
  diff**, then apply — never trust a blind rewrite.
- For Administration JavaScript, use the Shopware **codemods**; Rector is PHP only.

Reference the tool and run it; do not transcribe its rules here — they are
maintained upstream and would go stale.

## Done

- [ ] Supported `shopware/core` range identified from `composer.json`.
- [ ] Version-only API gated, or the range narrowed and the bump flagged.
- [ ] No Symfony API newer than the pinned Symfony version is used.
- [ ] Cross-version migration done via Rector (`frosh/shopware-rector` set), dry-run reviewed — not blind hand-edits.
- [ ] Both supported minors still work (tested/smoke-checked).
- [ ] 6.8 prep kept the `composer.json` range unless a minor was explicitly dropped.
- [ ] The suite was considered with `V6_8_0_0=1` as well as without it, and `FEATURE_ALL` was not used as that run.
- [ ] Cache, cart totals, documents, or flows were called out when the plugin touches them.
