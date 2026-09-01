---
name: shopware-admin-js
description: >-
  Shopware 6 Administration JS/TS/Vue and Jest. Use when editing Admin UI
  under src/Administration or a plugin Resources/app/administration — Vue
  modules, Meteor mt-* components, Pinia stores, Admin TypeScript, Jest
  specs. Triggers on "Administration Vue", "Admin TypeScript", "mt-modal",
  "Jest spec next to the component", "Admin ACL privileges". Do NOT use for
  storefront Twig/PluginManager (shopware-storefront), PHPUnit (shopware-testing),
  or PHP DAL/services (surface PHP skills).
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

Load a reference only when needed:

- Architecture, modules, ACL -> [`references/architecture.md`](references/architecture.md)
- Jest -> [`references/testing.md`](references/testing.md)
- Flags, deprecations, MWG gate -> [`references/flags-and-modern-web.md`](references/flags-and-modern-web.md)

## Hard guardrails

1. **TypeScript for new code.** Do not add new `.js` Admin sources.
2. **Do not break public Admin extension APIs** without prior discussion.
3. **Use Meteor / existing Admin components** (`mt-modal`, `mt-banner`,
   `mt-*`, or the local `sw-*` already in the file). Do not replace them
   with raw `<dialog>`, Popover API, or a custom select.
4. **ACL in the same change** as UI that reads or writes a DAL entity.
   Existing roles need a privileges migration; mapping-only fixes future
   roles.

## Admin deltas

- Follow the patterns in the area you touch: component factory / Twig.JS
  blocks on core, Vue SFC where the extension system already uses it.
- Prefer `Shopware.Component`, `Shopware.Service()`, `Shopware.Store` over
  importing factory internals.
- Modules stay independent — no direct import from another module.
- Core (`src/core`) stays Vue-free. Shared non-Vue helpers can be imported
  from `core`.
- Prefer composables for new shared Vue logic. Do not add new mixins unless
  extending legacy code.
- BEM + Meteor design tokens. No inline styles. Snippets for visible text.
- Reload an entity after a repository save so origin / change-set stay in
  sync.
- 6.7+ Admin build is Vite. Do not add a new `webpack.config.js`.

## Tests

- Jest for new features and bug fixes. New TS tests sit next to the code as
  `*.spec.ts`. Split large specs into `*.spec/` by behavior.
- `shallowMount` unless child rendering is the behavior. Clean up wrappers
  in `afterEach()`. `flushPromises()` after async repository/UI work.
- On trunk, run via composer wrappers (`composer eslint:admin`,
  `composer admin:unit`) or `shopware-podman-dev` — not a random host Node.

## Definition of done

- [ ] New code is TypeScript; public Admin APIs unchanged unless discussed.
- [ ] UI uses `mt-*` / existing Admin components, not raw dialog/popover.
- [ ] ACL mapping (+ role migration when needed) matches the DAL entities.
- [ ] Jest spec next to new TS; behavior tested, not Vue internals.
- [ ] Snippets for user-facing text; Meteor tokens for styling.
