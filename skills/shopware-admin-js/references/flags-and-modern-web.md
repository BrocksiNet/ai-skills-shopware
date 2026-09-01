# Admin flags, deprecations, and the modern-web gate

## Feature flags

- Flags are temporary rollout/deprecation branches, not permanent config.
- Administration JS flag names are uppercase (`V6_8_0_0`,
  `ADMIN_COMPOSITION_API_EXTENSION_SYSTEM`).
- One behavior per flag. No nested flags.
- Keep the old behavior in the branch that will be deleted with the flag.
- Test both relevant flag states while both branches exist.

## Deprecations

- `@deprecated tag:vX.Y.Z - …` plus a named replacement.
- Runtime warnings for developer-facing Admin APIs that callers must leave.
- Do not add new internal callers of deprecated APIs.
- Removing a flag also removes the legacy branch, flag config, obsolete
  tests, and stale docs in the same change.

## Do not replace Meteor / Admin components

`mt-modal`, `mt-popover`, `mt-banner`, `mt-select`, and the `sw-*` already
in the file are the primitive. Raw `<dialog>`, Popover API, custom
`<select>`, or a third-party overlay is a miss unless the user asked to
replace the design system.

If a leftover platform API remains (container queries in custom Admin CSS,
INP in a custom widget), look up
[`modern-web-guidance.md`](../../shopware-research-and-escalation/references/modern-web-guidance.md)
and adapt it. The Meteor component still wins if both apply.
