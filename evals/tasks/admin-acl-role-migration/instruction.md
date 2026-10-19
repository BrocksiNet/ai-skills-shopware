# Task: map Admin privileges and migrate existing roles

`swag-example` registers an Administration module that lists products.
It has no privilege mapping.

- Add `addPrivilegeMappingEntry` so `product:read` is required for viewers.
  Use `roles: { viewer: { privileges: [...], dependencies: [...] } }`. A
  flat `privileges: { viewer: [...] }` is rejected by Shopware.
- Existing roles that already hold `swag_example.viewer` must also get
  `product:read`. Mapping-only changes only fix future role evaluations, so
  add a migration for the roles that already exist.
- Keep the module registration.
