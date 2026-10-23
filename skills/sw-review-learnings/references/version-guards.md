# Version guards

Load this when a change adds or reviews a `class_exists`, `method_exists` or
`interface_exists` check for Shopware API. The supported range and how to
gate belong to `sw-plugin-development`
(`references/version-compatibility.md`); this file records the guard that
reviews keep finding.

## Recurring findings

- **REV-015** **A guard for API that every supported release ships.**
  `class_exists(Feature::class)`, `class_exists(CacheInvalidator::class)` and
  the like are dead code when the oldest release in the `shopware/core` range
  already has the class: the other branch never runs, and the comment next
  to the guard usually names a wrong version. Guard only API that arrived
  *within* the range. Check the oldest supported tag in the source
  (`git show v6.6.0.0:src/…`) before adding or accepting a guard; release
  folklore is often wrong (`CacheInvalidator` did not come with the 6.7 cache
  rework, it exists in every release since 6.5.0.0). A guard on a class whose
  method arrived later is the opposite mistake, covered by `PLG-024`.

## Done

- [ ] Every `class_exists` / `method_exists` guard on Shopware API names
      something that a release in the range lacks.
- [ ] The comment beside the guard names the release that added it.
