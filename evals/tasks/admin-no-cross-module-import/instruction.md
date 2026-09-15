# Task: stop importing another Admin module

`swag-example-orders/index.ts` imports a component from
`swag-example-products`. Administration modules stay independent.

- Remove the direct import from `swag-example-products`.
- Look the other module's component up through `Shopware.Component` (or a
  shared app/core helper), not a relative module path.
- Keep both modules. Do not merge them into one folder.
