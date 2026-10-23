# API-aware / headless review findings

Load this when reviewing whether a plugin/app is usable from a headless
frontend or via the Store/Admin API. Seeded from real plugin and app reviews;
grow it as new findings recur.

## Recurring findings

- **Custom data is template-only.** New entities/fields are rendered in Twig but
  never exposed through a Store-API route. A headless storefront (Nuxt/Next,
  mobile app) cannot reach them. Provide a Store-API route returning the data,
  not just a storefront controller.
- **REV-018** **POST-only actions with no API equivalent.** Cart/checkout customizations wired
  only to storefront form POSTs. Provide a Store-API endpoint so non-Twig clients
  can perform the action.
- **REV-019** **Hard-coded URLs / assumptions about the storefront** instead of returning data
  the client can render. Return data, let the client decide presentation.
- **REV-020** **Missing or inconsistent response shape.** Custom routes that return ad-hoc
  arrays instead of typed, documented, consistent structures (consider a DTO and
  an OpenAPI/Store-API schema entry).
- **New endpoint, no OpenAPI schema.** A Store-API or Admin API route is added
  but the OpenAPI spec is not updated (or the route is not registered in the
  schema at all). Reviewers treat this as a blocker for public API changes —
  add the path, request/response shapes, and tags before merge.
- **REV-036** **Released route and extension-point signatures are public API.** A parameter
  added to a shipped route or extension point, or a method made less visible, breaks
  every caller and subclass that already exists, so the change must not land silently.
  Add a required parameter through the `NewRequiredParameter` marker with the target
  version, and narrow visibility through the visibility-change marker, making the method
  private only in the next major. A new, unreleased extension point takes its values
  explicitly, with no default that a caller could omit by accident. Owning topic:
  `sw-core-development` -> `references/deprecations.md`.

## TODO

- TODO: pagination/filtering parity between storefront and Store-API.
- TODO: auth/context handling for store-api vs admin-api custom routes.

Owning topic for fixes: `sw-plugin-development`. This file records *why it
keeps happening*; the how-to lives in the plugin skill.
