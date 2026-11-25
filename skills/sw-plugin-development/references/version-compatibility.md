# Shopware 6.6 / 6.7 / 6.8 compatibility

Load this when a plugin must support more than one Shopware minor, or when you
introduce API that only exists in one of them.

## First: know the supported range

Check `composer.json` `require` for `shopware/core` (e.g. `~6.6.0 || ~6.7.0`).
That range is the contract. Your change must keep working across all of it, or
you must consciously narrow the range and call it out.

- **PLG-001** **Do not break the supported range silently.** Every Shopware
  class and method the change calls must exist in every release the
  `shopware/core` constraint allows, down to the oldest. The usual trap is
  the replacement for a deprecated method: it often arrives in the same minor
  that deprecates the old one, so the oldest supported minor does not have
  it, and every shop on that minor fails with an undefined method. Gate the
  new call (`PLG-024`), keep the old call until the range drops that minor,
  or narrow the range in `composer.json` and say so in the changelog with a
  major version.

Check when an API arrived from the source of each release, not from
memory. A class and its methods can arrive in different releases, and a
patch release can add a method. Run the `shopware-api-index`
npm package with `npx` (Node 26 or newer) from the plugin's root, the
folder with `composer.json`:

```bash
npx -y shopware-api-index@0.1.0-beta.2 facts .
```

It lists, for every release the `shopware/core` range allows, the Shopware
API the plugin uses that is missing, deprecated or internal there, with the
`file:line` that uses it: PHP classes and members, and the admin components
and blocks, storefront templates, blocks and JS plugins, and Twig functions
its overrides and templates rely on. The second line is the summary. A
template block or JS plugin core removed is not an error: the override just
stops working. A class core moved, whose old name is a runtime alias, is
listed as `moved`: the old name still works, but switch to the new one
before the release the line names, which removes the alias. A block
listed as `changed` still renders, but core reworked its body in the
releases named; an override that copies core markup instead of wrapping
`{{ parent() }}` must follow it.

The script is a built index of each release's source, so its spans are the
release evidence: `missing in 6.6.0.0 … 6.6.6.1` means the member arrived
in the next release, 6.6.7.0. Report that release, then fix it right away:
guard the call with `method_exists` on the member (`PLG-024`), keeping the
call and the range, or start the range at that release. Do not fetch the
core source per tag, search the web or read the script to confirm the
span, and do not look for what the older releases offer instead: the guard
is the fix, and the shop on an older release just does without. Run the
command again after the edit; a guarded call is no longer listed.

- **For one change**, pipe the diff in, and the script reports only what
  the change adds:
  `git diff | npx -y shopware-api-index@0.1.0-beta.2 facts --diff - .` `--range '~6.6.0 || ~6.7.0'` checks a
  range other than the one in `composer.json`.
- **Release mode** is what `facts` does: it reads each release from a
  weekly index it downloads once. To compare two refs of a
  shopware/shopware clone, such as a release tag and trunk, use
  `diff --repo <clone> --base v6.6.0.0 --head origin/trunk`.
- **No Node 26 or newer** (`node --version`): the script refuses to run.
  Read the oldest supported tag by hand, `git show v6.6.0.0:src/…` in a
  shopware/shopware clone, and say that the check was manual.

## Guarding version-specific code

When an API exists only in 6.7 (e.g. `CacheTagCollector::addTag()`) but you
still support 6.6:

- Prefer requiring 6.7+ and bumping `composer.json` *if* the project allows it —
  and state the bump explicitly.
- **PLG-024** Otherwise gate at runtime. Use capability checks (class/method/service exists)
  rather than version-string parsing where possible. Check the member you call, not
  only its class:

```php
// CacheTagCollector exists from 6.6.6.0, addTag() only from 6.7.2.0.
if (method_exists(CacheTagCollector::class, 'addTag')) {
    $this->collector->addTag($tag);
} else {
    $this->dispatcher->dispatch(new AddCacheTagEvent($tag));
}
```

- Keep both paths covered by tests, or at least smoke-checked, until you drop the
  old minor.

Do not guard a class or method that every release in the range already ships,
such as `Feature`, `Context`, `Criteria`, `EntityRepository` or `Kernel`
(`REV-015`).

## Optional packages

- **PLG-032** **A package in `suggest` may be missing.** Code that loads on
  every request (service and route files, subscribers, Twig templates and
  extensions) must not reference a class of a suggested package, such as
  `shopware/storefront` in a headless shop or an optional SDK, outside the
  guard that registers it. A controller registered outside the guard, a
  route file that names `StorefrontRouteScope`, or a template that calls a
  Twig function registered behind `class_exists()` breaks every request
  when the package is missing. Guard both sides, or move it to `require`.

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
([`modernization-and-flags.md`](../../sw-core-development/references/modernization-and-flags.md)).

## Preparing for 6.8 and Rector upgrades

For 6.8 preparation (`V6_8_0_0=1`, `CACHE_REWORK`, cart calculation,
`DOCUMENT_GENERATION_REWORK`, `FLOW_EXECUTION_AFTER_BUSINESS_PROCESS`) and
Rector / Administration codemod upgrades, see
[`upgrade-6-8-and-rector.md`](upgrade-6-8-and-rector.md).

## Done

- [ ] Supported `shopware/core` range identified from `composer.json`.
- [ ] Version-only API gated, or the range narrowed and the bump flagged.
- [ ] No Symfony API newer than the pinned Symfony version is used.
- [ ] Both supported minors still work (tested/smoke-checked).
