# Deprecations & breaking changes (core)

Load this when removing, renaming, or changing the behavior of anything that
might be public.

## The rule

Public API is **deprecated in one minor and removed in the next major**. You
never delete or change a public symbol's contract in place. If you are not sure
whether a symbol is public, assume it is.

## Deprecating code

Annotate the symbol and gate the old behavior behind the feature flag system so
the new behavior is testable before the major:

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

- Use `@deprecated tag:v6.x.0 - <reason and replacement>`. Always name the
  replacement.
- Wrap removed-in-major behavior changes in `if (Feature::isActive('v6.x.0')) { … }`
  so both paths exist until the major.
- Deprecate the whole surface: class, method, parameter, constant, public
  property, service id, event, and route as applicable.

## Breaking-change checklist

- [ ] Is there a non-breaking alternative (add new, deprecate old)? Prefer it.
- [ ] Deprecation annotation with `tag:` and a named replacement.
- [ ] `Feature::triggerDeprecationOrThrow()` (or the appropriate dispatch) in place.
- [ ] `RELEASE_INFO-6.x.md` entry describing the deprecation, its replacement and the timeline.
- [ ] `UPGRADE-6.x.md` entry when the break actually lands (in the major).
- [ ] Tests cover both the deprecated path (until major) and the new path.

## What counts as breaking

Changing a method signature, return type, or thrown exception; removing a
service/event/route; tightening a parameter type; changing default behavior;
renaming a public property or constant. Internal-only (`@internal`) symbols are
exempt — but verify the `@internal` was there before your change, not added by
you to dodge the policy.
