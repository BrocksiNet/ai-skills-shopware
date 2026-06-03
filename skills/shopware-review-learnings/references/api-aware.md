# API-aware / headless review findings

Load this when reviewing whether a plugin/app is usable from a headless
frontend or via the Store/Admin API. Seeded from real plugin and app reviews;
grow it as new findings recur.

## Recurring findings

- **Custom data is template-only.** New entities/fields are rendered in Twig but
  never exposed through a Store-API route. A headless storefront (Nuxt/Next,
  mobile app) cannot reach them. Provide a Store-API route returning the data,
  not just a storefront controller.
- **POST-only actions with no API equivalent.** Cart/checkout customizations wired
  only to storefront form POSTs. Provide a Store-API endpoint so non-Twig clients
  can perform the action.
- **Hard-coded URLs / assumptions about the storefront** instead of returning data
  the client can render. Return data, let the client decide presentation.
- **Missing or inconsistent response shape.** Custom routes that return ad-hoc
  arrays instead of typed, documented, consistent structures (consider a DTO and
  an OpenAPI/Store-API schema entry).

## TODO

- TODO: pagination/filtering parity between storefront and Store-API.
- TODO: auth/context handling for store-api vs admin-api custom routes.

Owning topic for fixes: `shopware-plugin-development`. This file records *why it
keeps happening*; the how-to lives in the plugin skill.
