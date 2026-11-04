# Administration architecture

Load when adding modules, components, services, or ACL-backed UI.

## Layers

- **ADM-014** Prefer extension-aware globals (`Shopware.Component`, `Shopware.Service()`,
  `Shopware.Store`) when they exist in that context. Boot code may need
  direct access before globals are ready.

## Modules and UI

- **ADM-006** In a plugin, build a new component the way its module already
  does. A module built with `Component.register` and Twig blocks gets no
  `.vue` file: an SFC has no blocks, so other extensions cannot override it.
  Where the module already renders SFCs, another one is fine. New core
  components follow `ADM-041` instead.
- **ADM-016** Protect routes, navigation, and templates with the required ACL
  privileges.
- **ADM-004** **New Admin UI that reads or persists a DAL entity updates the
  privilege mapping in the same change.** Limited roles need `read` / `create` /
  `update` / `delete` through viewer/editor/creator/deleter — do not rely
  on super-admin. `addPrivilegeMappingEntry` takes
  `roles: { viewer: { privileges: [...], dependencies: [...] } }`, and every
  role needs `dependencies`, even `[]`. A flat `privileges: { viewer: [...] }`
  passes `isPrivilegeMapping`, which checks only `category`, `parent` and
  `key`, and is registered. The role screens then throw a `TypeError` when
  they read the missing `roles`.
- Privileges that must apply to **existing** roles need a migration.
  Mapping-only changes fix future evaluations. In that migration call
  `$this->addAdditionalPrivileges($connection, ['swag_example.viewer' => ['product:read']])`
  from `MigrationStep`. It only extends roles that already hold the key, so
  roles a merchant restricted gain nothing. Never write `acl_role` with raw
  SQL or `$connection->update()`.
- **ADM-043** **A plugin role never grants `system_config:read` or
  `system_config:update`.** The system config API checks only those
  privileges, for every domain, so a role meant for one feature can read and
  change every extension's settings, API keys and secrets included. Serve
  the feature's own settings through a plugin Admin API route that checks
  the feature's privilege and reads only the plugin's domain.
- **ADM-044** **A bundle spanning 6.5 and 6.6+ must support both binding
  contracts of legacy value-based `sw-*` form fields.** Prefer `v-model:value`;
  explicit bindings that handle both contracts are also valid. In the default
  6.5 Vue 2 profile, `sw-text-field` emits `input` / `change`; 6.6 emits
  `update:value`. Bare `v-model` targets `modelValue` under Vue 3, leaving
  the field's `value` unbound. A legacy `@change` listener can receive a native
  DOM event through attribute forwarding instead of the edited string; do not
  rely on its scalar payload. An `@update:value` handler alone misses the
  default 6.5 events. `mt-*` components (6.6.2+) use `v-model`.
  The [6.5 handlers](https://github.com/shopware/shopware/blob/v6.5.8.0/src/Administration/Resources/app/administration/src/app/component/form/sw-text-field/index.js),
  [6.6 handlers](https://github.com/shopware/shopware/blob/v6.6.0.0/src/Administration/Resources/app/administration/src/app/component/form/sw-text-field/index.js)
  and [6.6 attribute forwarding](https://github.com/shopware/shopware/blob/v6.6.0.0/src/Administration/Resources/app/administration/src/app/component/form/sw-text-field/sw-text-field.html.twig)
  define that boundary.
- **ADM-009** **6.7+ builds the Administration with Vite.** A plugin
  `build/webpack.config.js` is not read on 6.7, so its aliases, loaders and
  plugins do nothing and an import that relies on them fails the build. Do
  not add one for a 6.7 target; a bundle that also supports 6.6 keeps it for
  6.6 only.
- **ADM-007** Prefer composables for new shared Vue logic. Do not add new mixins unless
  extending legacy code.
- Use BEM class names and Meteor design tokens. Avoid inline styles.

## Data

- **ADM-018** Repositories + Criteria, not ad-hoc HTTP or entity mutation.
- **ADM-019** Reasonable page sizes; disable total counts when the UI does not need
  them. Load only associations the screen uses.
- **ADM-020** Batch related writes into one save when possible.
- **ADM-021** Reload the entity after save so origin state and change tracking match.
- **ADM-045** **Reset and change shared Administration state through its store.** Call
  the store's `$reset()` instead of clearing its fields one by one in a component,
  and write changes to the store's own state so every consumer sees them. Do not
  keep a copy of store state in component data that can go stale, and do not add
  a reset of your own next to the store's `$reset()`, such as clearing the same
  fields in `created()`.
