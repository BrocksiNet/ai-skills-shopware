# Administration architecture

Load when adding modules, components, services, or ACL-backed UI.

## Layers

- **ADM-014** Prefer extension-aware globals (`Shopware.Component`, `Shopware.Service()`,
  `Shopware.Store`) when they exist in that context. Boot code may need
  direct access before globals are ready.

## Modules and UI

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
- **ADM-044** **One bundle for 6.5 and 6.6+ binds `sw-*` form fields with
  `v-model:value`.** On 6.5 (Vue 2) the fields emit `change`; from 6.6.0
  they emit only `update:value`. `@change` never fires on 6.6+, and `:value`
  with a bare `@update:value` never fires on 6.5, so the setting looks saved
  and is not. `v-model:value` works on both. `mt-*` components (6.6.2+) use
  `v-model`.
- **ADM-009** **6.7+ builds the Administration with Vite.** A plugin
  `build/webpack.config.js` is not read on 6.7, so its aliases, loaders and
  plugins do nothing and an import that relies on them fails the build. Do
  not add one for a 6.7 target; a bundle that also supports 6.6 keeps it for
  6.6 only.
- Use BEM class names and Meteor design tokens. Avoid inline styles.

## Data

- **ADM-018** Repositories + Criteria, not ad-hoc HTTP or entity mutation.
- **ADM-019** Reasonable page sizes; disable total counts when the UI does not need
  them. Load only associations the screen uses.
- **ADM-020** Batch related writes into one save when possible.
- **ADM-021** Reload the entity after save so origin state and change tracking match.
