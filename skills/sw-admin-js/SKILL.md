---
name: sw-admin-js
description: >-
  Apply Shopware 6 Administration rules for JS, TypeScript, Vue, and Jest. Use
  when editing Admin UI under src/Administration or a plugin's
  Resources/app/administration: Vue modules and single file component
  overrides, Meteor mt-* components such as mt-modal, Pinia stores, Admin ACL
  privileges, Admin TypeScript, Jest specs next to the component, or Admin
  changes for 6.8. Do NOT use for storefront Twig/PluginManager
  (sw-storefront), PHPUnit (sw-testing), or PHP DAL/services
  (surface PHP skills).
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
| [`architecture.md`](references/architecture.md) | You add a module, component override or ACL privilege. | `Resources/app/administration/src/module/**`, `Resources/app/administration/src/**/acl/index.{js,ts}`, `Shopware.Module.register(`, … |
| [`extension-api.md`](references/extension-api.md) | You change a shipped component, template block or position identifier. | `blocks-list.json`, `positionIdentifier`, … |
| [`testing.md`](references/testing.md) | You write or fix a Jest spec. | `Resources/app/administration/**/*.spec.{js,ts}`, `shallowMount(`, … |
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

- **ADM-006** Follow the patterns in the area you touch: component factory / Twig.JS
  blocks on core, Vue SFC where the extension system already uses it.
- Prefer `Shopware.Component`, `Shopware.Service()`, `Shopware.Store` over
  importing factory internals.
- Modules stay independent — no direct import from another module.
- Core (`src/core`) stays Vue-free. Shared non-Vue helpers can be imported
  from `core`.
- **ADM-007** Prefer composables for new shared Vue logic. Do not add new mixins unless
  extending legacy code.
- **ADM-008** BEM + Meteor design tokens. No inline styles. Snippets for visible text.
- Reload an entity after a repository save so origin / change-set stay in
  sync.
- 6.7+ Admin build is Vite. Do not add a new `webpack.config.js`.

## Tests

- **ADM-010** Jest for new features and bug fixes. New TS tests sit next to the code as
  `*.spec.ts`. Split large specs into `*.spec/` by behavior.
- `shallowMount` unless child rendering is the behavior. Clean up wrappers
  in `afterEach()`. `flushPromises()` after async repository/UI work.
- **ADM-011** On trunk, run via composer wrappers (`composer eslint:admin`,
  `composer admin:unit`) or `sw-podman-dev` — not a random host Node.

## Definition of done

- [ ] New code is TypeScript; public Admin APIs unchanged unless discussed.
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
<!-- enforced:end -->
