# Replacements, shims and code that ends at the major (core)

Load when you deprecate something, remove something in a major, or add code
that only lives until the next major.

`deprecations.md` owns the mechanics (`@deprecated tag:`, `BCChange`,
`triggerDeprecationOrThrow()`). This reference covers what makes a
deprecation actionable and a removal cheap.

## Rules

- **CORE-063** **The replacement must be usable today.** A deprecation that warns
  points at a replacement extensions can call now: not `@internal`, not
  `@experimental`, not active only behind the major flag. Until it is, the
  deprecation stays silent (`silentUntil:` or no runtime trigger), or plugin
  authors see warnings they cannot act on.
- **CORE-064** **Ask for a shim before a break.** When the impact of a removal is
  large or unknown, keep the old name and delegate, keep the field and map it,
  or keep a forwarding template. A few lines in core save every affected
  extension a release.
- **CORE-065** **Mark or gate code that ends at the major when you add it.** A
  bridge, legacy branch or helper gets `@deprecated tag:vX.Y.0` or an inline
  `// @deprecated tag:` comment; behaviour that must go sits in a
  `Feature::isActive()` branch; a DAL field that UPGRADE calls removed gets
  the `Deprecated` flag and a next-major migration. Unmarked code survives the
  major cleanup.
- **CORE-078** **Write version-shaped identifiers in the four-part form.** Feature
  flags in `Feature::` calls and `silentUntil`, `@deprecated tag:` markers and
  deprecation tags take `vX.Y.Z.0`, such as `v6.8.0.0`. A three-part, minor-only
  or unprefixed string maps to a different flag or to none, so the deprecation
  never fires or fires for the wrong release. Static analysis should reject a
  flag argument that does not match the four-part pattern, and its message names
  the corrected form.

## Eval

`review-deprecation-internal-replacement-catch` / `-ignore` (CORE-063).
`review-version-identifier-catch` / `-ignore` (CORE-078).
