---
name: sw-admin-js
description: >-
  Shopware 6 Administration rules for JS, TypeScript, Vue, and Jest. Load
  before editing src/Administration or Resources/app/administration: Vue
  modules, SFC or Twig/Options API overrides (swDefineOverride), Meteor mt-*
  components, Pinia stores, Admin ACL, Jest specs, or 6.8 upgrades. Do NOT use
  for storefront (sw-storefront), PHPUnit (sw-testing), or PHP backend.
license: MIT
metadata:
  contexts: core plugin app project
  tasks: build review
  defers_to: shopware-admin-js
---

# Shopware Admin JS

Rules for Administration TypeScript, Vue, Meteor components, and Jest.
Mined from core `shopware-admin-js` plus
`coding-guidelines/administration/` and
`src/Administration/Resources/app/administration/AGENTS.md`. Rewritten, not
copied.

> **Upstream (trunk):** If `.agents/skills/shopware-admin-js/` exists, prefer
> it for the short mandatory list. This skill keeps the plugin/project
> deltas and the Meteor / modern-web gate.

Read only the reference that matches the task or the files it changes:

<!-- routes:start: generated from routes.json by `node tools/bin/render-routes.ts`; do not edit -->
| Read | When | Or the change touches |
| ---- | ---- | --------------------- |
| [`architecture.md`](references/architecture.md) | You add a module, component override or ACL privilege. | `administration/src/module/**`, `acl/index.*`, `Shopware.Module.register(` |
| [`extension-api.md`](references/extension-api.md) | You change a shipped component, template block, deprecation marker or position identifier. | `blocks-list.json`, `administration/public-api/**`, `positionIdentifier`, … |
| [`testing.md`](references/testing.md) | You write or fix a Jest spec or the shared Jest setup. | `Resources/app/administration/**/*.spec.{js,ts}`, `Resources/app/administration/test/_setup/**`, `shallowMount(`, … |
| [`flags-and-modern-web.md`](references/flags-and-modern-web.md) | A change needs a feature flag, a deprecation or a modern web API. | `Shopware.Feature.isActive(`, … |
<!-- routes:end -->

## Hard guardrails

1. **ADM-002** **Do not break public Admin extension APIs** without prior discussion.
2. **ADM-003** **Use Meteor / existing Admin components** (`mt-modal`, `mt-banner`,
   `mt-*`, or the local `sw-*` already in the file). Do not replace them
   with raw `<dialog>`, Popover API, or a custom select.
3. **ACL in the same change** as UI that reads or writes a DAL entity.
   Existing roles need a privileges migration; mapping-only fixes future
   roles.
4. **ADM-005** **Do not rewrite a working Twig / Options API override into a Vue SFC
   because of 6.8.** `swDefinePublic`, `swDefineOverride`, and
   `useSwPreviousState()` are an experimental Composition API
   ([shopware/shopware#21162](https://github.com/shopware/shopware/discussions/21162)).
   The docs are a preview and will change. Twig and the Options API still
   work. Trying the new form later is optional; it is not the upgrade.

## Admin deltas

- **ADM-041** New components are TypeScript and export
  `Shopware.Component.wrapComponentConfig({ ... })`, which types `this` in
  the options. Shared logic comes from composables such as
  `useNotification()`, not mixins (`ADM-007`). On trunk, copy the shape of
  the reference implementations named in the Administration `AGENTS.md`
  (component `sw-media-folder-thumbnail`, composable `use-theme.ts`, store
  `tabs.store.ts`), not the code next to the change, which often predates
  these rules.
- Prefer `Shopware.Component`, `Shopware.Service()`, `Shopware.Store` over
  importing factory internals.
- Modules stay independent — no direct import from another module.
- Core (`src/core`) stays Vue-free. Shared non-Vue helpers can be imported
  from `core`.
- Prefer composables for new shared Vue logic over new mixins (`ADM-007`).
- **ADM-008** BEM + Meteor design tokens. No inline styles. Snippets for visible text.
- Reload an entity after a repository save so origin / change-set stay in
  sync.
- 6.7+ Admin build is Vite. Do not add a new `webpack.config.js`.
- For a form bundle spanning 6.5 and 6.6+, read the binding contracts in
  [architecture.md](references/architecture.md) before editing. Legacy
  value-based `sw-*` fields normally need `v-model:value` (`ADM-044`).

## Tests

- **ADM-010** Jest for new features and bug fixes. New TS tests sit next to the code as
  `*.spec.ts`. Split large specs into `*.spec/` by behavior.
- `shallowMount` unless child rendering is the behavior. Clean up wrappers
  in `afterEach()`. `flushPromises()` after async repository/UI work.
- **ADM-011** On trunk, run via composer wrappers (`composer eslint:admin`,
  `composer admin:unit`) or `sw-local-dev` — not a random host Node.

## Definition of done

- [ ] New code is TypeScript; new components use `wrapComponentConfig()`.
- [ ] Public Admin APIs unchanged unless discussed.
- [ ] UI uses `mt-*` / existing Admin components, not raw dialog/popover.
- [ ] ACL mapping (+ role migration when needed) matches the DAL entities.
- [ ] Jest spec next to new TS; behavior tested, not Vue internals.
- [ ] Snippets for user-facing text; Meteor tokens for styling.

## Already enforced by CI (do not repeat)

<!-- enforced:start: generated from rules/catalog.json by `node tools/bin/render-enforced.ts`; do not edit -->
CI already fails the build on these, so do not repeat them in reviews or
checklists. Flag only what each check misses.
Checks marked *trunk only* are not active in plugin or app projects by
default; there the rule still needs a reviewer.

- `ADM-003` `no-deprecated-components` (ESLint, trunk only) reports listed deprecated `sw-*` components in Administration `.html.twig` templates and autofixes them to `mt-*`. It misses `.vue` templates, templates in JS or TS strings, raw `<dialog>` or popover markup, and `sw-*` components not in the configured list, such as `sw-loader` and `sw-popover`; flag those.
- `ADM-007` `sw-core-rules/no-new-mixins` (ESLint, trunk only) reports `Mixin.register()` and `Shopware.Mixin.register()` in Administration `src` files, specs excluded, with inline disables blocked. It misses inline mixin objects in a `mixins` array, a renamed alias such as `const M = Shopware.Mixin`, `.vue` files, and a new component that pulls in an existing mixin through `Mixin.getByName()`; flag those.
- `ADM-039` `scripts/generate-public-api/snapshot/committed-snapshot.spec.ts` (test, trunk only) reports stale committed Administration `public-api/` snapshots and removed blocks in core CI. It misses plugin or app components, unannounced prop/method/block moves when a PR regenerates the snapshot without running the break check, and behavioral changes inside a method; flag those.
- `ADM-049` `sw-deprecation-rules/valid-api-markers` (ESLint, trunk only) reports malformed `@deprecated` and `@bc-change` markers, unknown kinds or keys, and single-edit tag typos in Administration JS, TS, Vue, and Twig comments. It misses using a syntactically valid `@deprecated tag:vX.Y.Z` instead of `@bc-change <Kind> version:vX.Y.Z` on an element that stays, or a `@bc-change` whose kind or keys do not match the actual change; flag those.
<!-- enforced:end -->
