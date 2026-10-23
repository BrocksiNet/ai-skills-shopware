# Feature flag review findings

Load this when a change reads a Shopware feature flag, or an environment
variable that may be one. Seeded from real reviews; grow as findings recur.

## Recurring findings

- **REV-016** **Direct `$_SERVER`/`getenv` access for Shopware feature flags** — use
  `Feature::has('FLAG') && Feature::isActive('FLAG')` (or `!Feature::has() || Feature::isActive()`
  for "assume active when flag is gone"). `Feature::has()` guards against
  `E_USER_WARNING` on unregistered flags; going below the platform API produces
  fragile code reviewers will flag. (Owning topic: `sw-plugin-development`
  -> `references/version-compatibility.md`.)
