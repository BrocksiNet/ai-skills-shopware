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

## Which annotation, when (BC lifecycle)

Shopware's backward-compatibility workflow uses different annotations depending
on where the change is in its lifecycle. Pick the right one:

| Situation | Annotation | Notes |
| --------- | ---------- | ----- |
| New public API still being stabilised | `@internal` | Mark new public API `@internal` until release; remove the tag when it goes public. |
| Obsolete code, replacement shipping **now** behind a feature flag | `@feature-deprecated` | During development; becomes a plain `@deprecated` when the feature is released. |
| Obsolete public code, removal scheduled for the **next major** | `@deprecated tag:v6.x.0` | The standard deprecation; old code removed in the major. |
| Breaking change hidden behind a **major** feature flag | `@major-deprecated` | Hide breaking behaviour behind the major flag; document it in `UPGRADE`. |

Always name the replacement and the target tag, and keep both code paths alive
until the major lands. See the developer-docs
[Backward Compatibility](https://developer.shopware.com/docs/resources/guidelines/code/backward-compatibility.html)
guide for the full matrix.

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
