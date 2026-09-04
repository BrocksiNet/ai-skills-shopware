# Administration architecture

Load when adding modules, components, services, or ACL-backed UI.

## Layers

- Keep `core` free of Vue. Modules must not import another module directly;
  talk through registered services, repositories, routes, stores, or shared
  app/core code.
- Keep boot order `init-pre/ → init/ → init-post/` when touching startup.
- Prefer extension-aware globals (`Shopware.Component`, `Shopware.Service()`,
  `Shopware.Store`) when they exist in that context. Boot code may need
  direct access before globals are ready.
- Preserve extension points on the global `Shopware` object when changing
  repositories, services, components, and stores.

## Modules and UI

- Protect routes, navigation, and templates with the required ACL
  privileges.
- New Admin UI that reads or persists a DAL entity: update the privilege
  mapping in the **same** change. Limited roles need `read` / `create` /
  `update` / `delete` through viewer/editor/creator/deleter — do not rely
  on super-admin. `addPrivilegeMappingEntry` takes
  `roles: { viewer: { privileges: [...], dependencies: [...] } }`. A flat
  `privileges: { viewer: [...] }` fails `isPrivilegeMapping` and never
  registers the key.
- Privileges that must apply to **existing** roles need a migration on
  `acl_role.privileges`. Mapping-only changes fix future evaluations.
- Business logic stays out of templates. Prefer composables over new
  mixins.
- Use BEM class names and Meteor design tokens. Avoid inline styles.

## Data

- Repositories + Criteria, not ad-hoc HTTP or entity mutation.
- Reasonable page sizes; disable total counts when the UI does not need
  them. Load only associations the screen uses.
- Batch related writes into one save when possible.
- Reload the entity after save so origin state and change tracking match.
