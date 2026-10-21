# API contracts (Store-API / Admin / headless)

Load when adding or changing HTTP endpoints in plugins or project code.

## Requirements

Every **new public** Store-API or Admin API route must ship:

1. **PLG-011** **OpenAPI documentation** — attributes (`OpenApi\…`) and/or schema files under
   `Resources/Schema/` (follow existing plugin/core conventions in the project).
2. **PLG-012** **Stable response shape** — typed struct/DTO or documented fields; avoid ad-hoc
   untyped arrays for public responses.
3. **ACL / scope** — see `shopware-security` → `api-acl-and-input.md`.
4. **PLG-013** **Headless parity** — data shown only in Twig should also have a Store-API route
   when headless clients need it (`shopware-review-learnings` → `api-aware.md`).

## Changing a released route

Headless clients and apps parse the response you shipped. They break on a
change they cannot see in the version number.

- **PLG-027** **Never change the type or nullability of an existing response
  field.** `int` to `float`, `int` to `?int`, or a scalar to an object breaks
  every typed client. Add a new field with the new shape, keep filling the old
  one, and deprecate it in the OpenAPI schema (`deprecated: true`) and in the
  struct. Remove it only in the next major. Adding an optional field is fine.

## Core vs extension

- **`shopware/shopware` `src/Core` routes** — defer to in-repo `shopware-php-code`
  and `ApiRoutesHaveASchemaTest` when present.
- **Plugins / project routes** — this reference owns the contract.

## Checklist

- [ ] Route registered with correct scope (store-api / api).
- [ ] OpenApi path/operation documented.
- [ ] Request/response schemas match implementation.
- [ ] Sales-channel context used for storefront-facing reads.
- [ ] Existing response fields keep their type and nullability.

## Eval

`store-api-openapi-required` — custom Store-API route must reference OpenApi.
`review-store-api-contract-catch` / `-ignore` — a review finds the changed
field type and stays quiet on an added optional field.
