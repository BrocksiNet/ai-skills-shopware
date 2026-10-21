# Store-API / Admin API ACL and input

## Custom routes

- Declare **privileges** / `_acl` consistent with existing Admin routes.
- Store-API: use correct **route scope** (e.g. login required vs public).
- **SEC-005** Validate and type **input** — do not trust query/body parameters without constraints.
- **SEC-008** **A stored idempotent response is replayed only to the caller
  that created it.** Key it by the idempotency key plus the sales channel
  and the customer, or the integration or user for the Admin API, and store
  a hash of the request body: the same key with a different body is an
  error, not a replay. A key without that scope hands whoever reuses or
  guesses it another caller's response, with its tokens, codes and data.

## Changing an existing route

- **SEC-007** **Do not change who can call a released route or how it is cached.**
  Changing `_routeScope`, `_loginRequired`, `_loginRequiredAllowGuest`,
  `_httpCache` or the `_acl` privileges of an existing route locks out clients
  that worked (`401`/`403`) or serves stale or personal data from the cache.
  Add a new route with the new access rule, deprecate the old one, and switch
  in the next major. Whether the new rule is safe is still this skill's call.

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
`review-route-defaults-changed-catch` / `-ignore` — a changed `_loginRequired`
on a released route.
`review-idempotency-key-scope-catch` / `-ignore` — an idempotency store
keyed only by the header.
