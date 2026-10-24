# Replacements, shims and code that ends at the major (core)

Load when you deprecate something, remove something in a major, or add code
that only lives until the next major.

`deprecations.md` owns the mechanics (`@deprecated tag:`, `BCChange`,
`triggerDeprecationOrThrow()`). This reference covers what makes a
deprecation actionable and a removal cheap.

## Rules

- **CORE-017** Use `@deprecated tag:v6.x.0 - <reason and replacement>`. Always name the
  replacement.
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

## Eval

`review-deprecation-internal-replacement-catch` / `-ignore` (CORE-063).

`review-deprecation-tag-replacement-catch` / `-ignore` (CORE-017).
