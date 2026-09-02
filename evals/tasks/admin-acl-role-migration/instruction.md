# Task: map Admin privileges and migrate existing roles

`swag-example` registers an Administration module that lists products.
It has no privilege mapping.

- Add `addPrivilegeMappingEntry` so `product:read` is required for viewers.
- Add a migration that updates existing `acl_role.privileges`. Mapping-only
  changes only fix future role evaluations.
- Keep the module registration.
