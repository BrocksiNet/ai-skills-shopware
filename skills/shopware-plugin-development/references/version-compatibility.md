# Shopware 6.6 / 6.7 compatibility

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

## Symfony version alignment

Each Shopware minor pins a Symfony major (roughly: 6.6 → Symfony 6.4 LTS, 6.7 →
Symfony 7.x — confirm against `composer.lock`, do not assume). Do **not** use a
Symfony API newer than the version your supported Shopware range ships; the
installed Symfony is the contract, not the latest Symfony docs. See
[`symfony-first.md`](symfony-first.md) for preferring Symfony components in
**plugin** code; core modernization uses feature flags
([`modernization-and-flags.md`](../../shopware-core-development/references/modernization-and-flags.md)).

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
