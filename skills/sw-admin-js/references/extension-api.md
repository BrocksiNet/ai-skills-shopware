# Administration extension API (what plugins build on)

Load when you change a component, template block or position identifier that
a released version shipped, or override one from a plugin.

Plugins override components with `Component.override()`, extend template
blocks, call methods through `$super`, and render into position identifiers.
None of that shows up in a TypeScript signature, so nothing warns when it
breaks.

Core tracks these surfaces in a snapshot. Up to 6.7 the block list was
`blocks-list.json`, and historical cross-minor checks (6.5–6.7, including
Admin SCSS variables/mixins and snippet placeholders) run via
`shopware-api-index` `facts`. Trunk (6.8+) replaces `blocks-list.json` with
the committed `public-api/` snapshot (`public-api/index.json` plus one
`<component>.api.md` report per component with blocks, nesting, `[after v-if]`,
`[scope: ...]`, `crossings`, and members). Core contributors regenerate it with
`composer admin:generate-public-api`, and 6.8+ plugins can validate against it
with `admin:check-extensions --target=<major>`.

## Rules

- **ADM-039** **A shipped component's props, slots, events, Twig blocks, `methods`,
  `computed` and `data` members and `swDefinePublic` keys are public API.**
  Deprecate before you rename, move or remove one, and keep the old name
  working until the next major. Do not add a `required: true` prop to an
  existing component: every plugin that already uses it now misses the prop.
  Add it as optional with a default. A block override of a removed block
  silently renders nothing.
- **ADM-049** **On core trunk, announce planned breaking changes to an
  Administration element that stays with `@bc-change <Kind> version:vX.Y.Z`,
  not `@deprecated`.** `@deprecated tag:vX.Y.Z` is reserved for elements that
  are removed or replaced; putting it on an element that stays makes the
  extension ESLint preset report every plugin use as an error. Use the matching
  kind and required keys (for example `@bc-change BlockMoved version:v6.8.0 parent:sw_card`,
  `@bc-change ScopeVariableRemoval version:v6.8.0 variable:itemIndex`, or
  `@bc-change ParameterRemoval version:v6.8.0 parameter:itemIndex`), keep the
  old contract working while the major flag is off, and regenerate `public-api/`
  with `composer admin:generate-public-api`.

## Overriding a core component

- **ADM-042** **An override calls `this.$super('<method>', ...args)` for every
  method it replaces.** `$super` is the link to the overrides other plugins
  registered before yours and to core's own code. An override that copies
  core's body instead skips both: the other plugin's change disappears, and
  the core fix of the next release never reaches this shop. Run your code
  before or after `$super` and change its result. Replace the body only when
  the override must stop core's behavior, and say so in a comment.
- **ADM-046** **Check the core block's boundaries before replacing it without
  `{% parent %}`.** Administration overrides merge statically into the core
  template before Vue compiles it. If the core block opens or closes an HTML
  element that crosses into another block, or starts or continues a
  `v-if` / `v-else-if` / `v-else` chain across block boundaries, replacing the
  block without `{% parent %}` breaks template compilation with a mismatched
  closing tag or an orphaned `v-else`. Inspect the core template (or the
  `crossings` and `[after v-if]` markers in `public-api/*.api.md` on 6.8+) and
  keep `{% parent %}` or preserve the matching tag or conditional chain.
- **ADM-047** **Use only `v-for` and scoped-slot variables the overridden core
  block actually exposes.** Twig merges the override verbatim into the core
  template, so referencing a removed or nonexistent scope variable (such as
  `itemIndex` inside a slot that only exposes `{ item }`) compiles cleanly and
  silently evaluates to `undefined` at runtime. Verify the enclosing `v-for`
  and slot bindings in the core template (or `[scope: ...]` in
  `public-api/*.api.md` on 6.8+).
- **ADM-048** **Do not access `this.$parent` or import directly from core's
  internal `src/` tree in a plugin.** Wrapping a core component (such as
  migrating to Meteor `mt-*` containers) shifts the `$parent` chain and breaks
  parent property or method access; importing core internal paths (like
  `src/app/...` or relative paths into `vendor/shopware/administration/src/`)
  bypasses `Shopware.Component`, `Shopware.Service()`, and `Shopware.Store`,
  breaks on internal file moves, and fails in Vite builds. Use props, emits,
  `provide`/`inject`, and the public `Shopware` globals instead. Reading a
  core `$refs` entry or styling core CSS classes is fragile, not blocking —
  rate that advisory (`minor`), not `major` or `blocking`.
- **ADM-050** **Verify that the target component actually declares every method
  an override replaces or passes to `this.$super('<name>')`.** A typo or silent
  rename in core leaves a plugin's override method uncalled and causes
  `this.$super('<name>')` to fail at runtime. Check the core component source
  (or `public-api/` on 6.8+ and `shopware-api-index` `facts` for 6.5–6.7).

## Eval

`review-admin-prop-removed-catch` / `-ignore`,
`review-admin-position-identifier-catch` / `-ignore`,
`review-admin-override-super-catch` / `-ignore`,
`review-admin-override-block-crossing-catch` / `-ignore`,
`review-admin-override-scope-var-catch` / `-ignore`,
`review-admin-plugin-parent-import-catch` / `-ignore`,
`review-admin-bc-change-marker-catch` / `-ignore`,
`review-admin-override-missing-method-catch` / `-ignore`.
