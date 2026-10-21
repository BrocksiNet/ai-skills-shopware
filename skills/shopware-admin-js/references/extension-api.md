# Administration extension API (what plugins build on)

Load when you change a component, template block or position identifier that
a released version shipped, or override one from a plugin.

Plugins override components with `Component.override()`, extend template
blocks, call methods through `$super`, and render into position identifiers.
None of that shows up in a TypeScript signature, so nothing warns when it
breaks.

## Rules

- **ADM-039** **A shipped component's props, slots, events, Twig blocks, `methods`,
  `computed` and `data` members and `swDefinePublic` keys are public API.**
  Deprecate before you rename, move or remove one, and keep the old name
  working until the next major. Do not add a `required: true` prop to an
  existing component: every plugin that already uses it now misses the prop.
  Add it as optional with a default. A block override of a removed block
  silently renders nothing.
- **ADM-040** **Entries in `blocks-list.json` and position identifiers are a
  contract** with the apps and plugins that render into them. Never rename or
  remove one without a deprecation; add the new identifier next to the old one.

## Overriding a core component

- **ADM-042** **An override calls `this.$super('<method>', ...args)` for every
  method it replaces.** `$super` is the link to the overrides other plugins
  registered before yours and to core's own code. An override that copies
  core's body instead skips both: the other plugin's change disappears, and
  the core fix of the next release never reaches this shop. Run your code
  before or after `$super` and change its result. Replace the body only when
  the override must stop core's behavior, and say so in a comment.

## Eval

`review-admin-prop-removed-catch` / `-ignore`,
`review-admin-position-identifier-catch` / `-ignore`,
`review-admin-override-super-catch` / `-ignore`.
