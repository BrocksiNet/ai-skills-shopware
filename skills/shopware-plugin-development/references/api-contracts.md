# API contracts (Store-API / Admin / headless)

Load when adding or changing HTTP endpoints in plugins or project code.

## Requirements

Every **new public** Store-API or Admin API route must ship:

1. **OpenAPI documentation** — attributes (`OpenApi\…`) and/or schema files under
   `Resources/Schema/` (follow existing plugin/core conventions in the project).
2. **Stable response shape** — typed struct/DTO or documented fields; avoid ad-hoc
   untyped arrays for public responses.
3. **ACL / scope** — see `shopware-security` → `api-acl-and-input.md`.
4. **Headless parity** — data shown only in Twig should also have a Store-API route
   when headless clients need it (`shopware-review-learnings` → `api-aware.md`).

## Core vs extension

- **`shopware/shopware` `src/Core` routes** — defer to in-repo `shopware-php-code`
  and `ApiRoutesHaveASchemaTest` when present.
- **Plugins / project routes** — this reference owns the contract.

## Checklist

- [ ] Route registered with correct scope (store-api / api).
- [ ] OpenApi path/operation documented.
- [ ] Request/response schemas match implementation.
- [ ] Sales-channel context used for storefront-facing reads.

## Eval

`store-api-openapi-required` — custom Store-API route must reference OpenApi.
