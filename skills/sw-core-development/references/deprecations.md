# Deprecations & breaking changes (core)

Load this when removing, renaming, or changing the behavior of anything that
might be public. When **replacing an internal implementation** with Symfony or a
newer service, see also
[`modernization-and-flags.md`](modernization-and-flags.md).

**Applies to shopware/shopware platform code.** Plugins still deprecate with a
normal `@deprecated` + replacement; they do not use the BC-change attributes
below.

## The rule

Public API is **announced in one minor and removed in the next major**. You
never delete or change a public symbol's contract in place. If you are not sure
whether a symbol is public, assume it is.

**CORE-011** Pick the tool by situation. Do not mix them.

| Situation | Tool |
| --------- | ---- |
| Planned major-version contract change, **no replacement today** | A `BCChange` attribute. Keep the current API usable. |
| Functionality is **removed or has a replacement callers must use now** | `@deprecated` plus `Feature::triggerDeprecationOrThrow()` on executable paths. |
| Deprecated **exception class** constructor or factory, or a deprecated **framework callback** the framework still calls normally (subscriber, listener, DAL exception handler, rule method) | `Feature::throwIfActive($majorFlag, $message)` as the first statement. It stays silent before removal, so callers who cannot migrate get no noise, and throws once the flag is active, even inside `Feature::silent()`. |

**CORE-012** On trunk, discovery methods return a neutral value when the removal flag is
active instead of throwing: `getSubscribedEvents()` and Twig `getFilters()` /
`getFunctions()` return `[]`, DAL `matchException()` and rule `getConfig()`
return `null`. PHPStan checks these contracts. Deprecated factories on
**retained** domain exception classes keep `triggerDeprecationOrThrow()`.

## Planning a future break (`BCChange`)

Use an attribute from `Shopware\Core\Framework\Deprecation\BCChange`. It is
planning metadata, not a deprecation.

```php
use Shopware\Core\Framework\Deprecation\BCChange\ParameterTypeNarrowing;

#[ParameterTypeNarrowing(version: 'v6.8.0', parameterName: 'id', newType: 'string')]
public function load(string|int $id): void
{
    // current contract stays callable until v6.8.0
}
```

**CORE-014** Pick the most specific attribute. Audience:

- **`CallSiteCompatibilityChange`** — calling the method can break, including
  `parent::` from a subclass (`ParameterTypeNarrowing`, `ParameterRemoval`,
  `NewRequiredParameter`, `ReturnTypeNarrowing`, …).
- **`ExtenderCompatibilityChange`** — an override or inheritance relationship
  can break (`BecomesAbstract`, `BecomesFinal`, `ClassHierarchyChange`, …).
- Some attributes implement both.

**CORE-015** Values must stay machine-readable: `vX.Y.Z` version, parameter names **without**
`$`, `::class` for class references, the real default for `NewOptionalParameter`.
PHPStan rejects attributes that do not describe a structurally possible change.

## Deprecating code that already has a replacement

```php
/**
 * @deprecated tag:v6.8.0 - Will be removed, use NewService::handle() instead.
 */
public function oldHandle(Context $context): void
{
    Feature::triggerDeprecationOrThrow(
        'v6.8.0',
        Feature::deprecatedMethodMessage(self::class, __METHOD__, 'v6.8.0', 'NewService::handle()')
    );
    // old behavior
}
```

- **CORE-017** Use `@deprecated tag:v6.x.0 - <reason and replacement>`. Always name the
  replacement.
- **CORE-018** Wrap removed-in-major behavior changes in `if (Feature::isActive('v6.x.0')) { … }`
  so both paths exist until the major.
- **CORE-019** Deprecate the whole surface: class, method, parameter, constant, public
  property, service id, event, and route as applicable.

## Calling deprecated code from core (BC)

- **CORE-021** **Do not add new code paths** that call deprecated functionality. Move internal
  callers to the replacement API and keep legacy behavior only in focused BC tests.
- **CORE-022** When adding `@deprecated` on executable PHP, add matching
  `Feature::triggerDeprecationOrThrow()` unless the deprecation uses an explicit
  exception reason allowed by the PHPStan deprecation rule.
- **CORE-023** For **private implementation cleanup** (not a public deprecation cycle), use a
  short inline comment: `// @deprecated tag:vX.Y.Z - …` near the branch to remove
  later — not a method-level `@deprecated` annotation.
- **CORE-024** If a deprecated API remains for BC, add or keep **dedicated legacy tests** that
  are easy to remove with the deprecation; guard with the relevant major feature
  flag when needed.

## Which marker, when

| Situation | Marker |
| --------- | ------ |
| New public API still being stabilised | `@internal` until it is released |
| Planned major contract change, no replacement yet | `#[…]` from `BCChange` (see above) |
| Obsolete public code with a replacement **shipping now** | `@deprecated tag:v6.x.0` + `Feature::triggerDeprecationOrThrow()` |
| Private cleanup reminder | `// @deprecated tag:vX.Y.Z` next to the branch |

Always name the replacement (or the future contract) and the target version.
Keep both code paths alive until the major lands. See the developer-docs
[Backward Compatibility](https://developer.shopware.com/docs/resources/guidelines/code/backward-compatibility.html)
guide for the full matrix.

## Breaking-change checklist

- [ ] Is there a non-breaking alternative (add new, deprecate old)? Prefer it.
- [ ] Planned break uses a `BCChange` attribute, not `@deprecated reason:*`.
- [ ] Real removal/replacement uses `@deprecated tag:` plus
      `Feature::triggerDeprecationOrThrow()` on executable paths.
- [ ] `RELEASE_INFO-6.x.md` describes the replacement (or the announced change)
      and who is affected.
- [ ] `UPGRADE-6.x.md` describes what will break and the concrete migration steps.
- [ ] Tests cover the current path, the incompatible legacy use (when signaled),
      and the new path.

## What counts as breaking

**CORE-026** Changing a method signature, return type, or thrown exception; removing a
service/event/route; tightening a parameter type; changing default behavior;
renaming a public property or constant. Internal-only (`@internal`) symbols are
exempt — but verify the `@internal` was there before your change, not added by
you to dodge the policy.

## Eval

`review-bc-change-most-specific-catch` / `-ignore` (CORE-014).
