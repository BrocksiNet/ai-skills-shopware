# Store-API / Admin API ACL and input

## Custom routes

- Declare **privileges** / `_acl` consistent with existing Admin routes.
- Store-API: use correct **route scope** (e.g. login required vs public).
- Validate and type **input** — do not trust query/body parameters without constraints.

## Common review failures

- Admin action route with no ACL check.
- Store-API route exposing data that should require login or sales-channel context.
- Copy-pasting privilege constant shapes that PHPStan rules reject.

## Pair with

- OpenAPI contract for public routes → `shopware-plugin-development` →
  `api-contracts.md`
- Headless exposure → `shopware-review-learnings` → `api-aware.md`

## Eval

`store-api-route-missing-acl` — fixture route without privilege annotation.
