---
name: sw-openapi-dto
description: >-
  Rules for the PHP request and response DTOs that shopware/shopware generates
  from its OpenAPI schema JSON. Load it before any edit that touches an
  operation with x-dto-namespace, x-dto-package or x-dto-inline, a generated
  DTO ("This file is auto-generated"), AbstractDto, AbstractRequest,
  AbstractResponse, DTOResponseListener, a core controller with
  MapRequestPayload that returns a response DTO, the open-api:generate-dtos
  command, or the generator fixtures under tests/unit/Core/Framework/Api/OpenApi.
  Covers schema-first changes, field presence and null, DEFAULT_ constants,
  extensions, status codes and headers. Do NOT use for a core route without
  DTOs (sw-core-development), a plugin Store API route or schema
  (sw-plugin-development), or a hand-written PHP DTO or value object
  (sw-php-foundation).
license: MIT
metadata:
  contexts: core
  tasks: build review answer
---

# OpenAPI DTO generation (core)

> **Do not edit a generated DTO.** A file whose header says "This file is
> auto-generated" changes only through its schema JSON and
> `bin/console open-api:generate-dtos`. Run the command after the schema
> change, then `--check`; do not assume it fails because `vendor/` looks
> missing. Only when it has failed, keep the schema change, report the
> error and tell the user to regenerate. A hand-written property
> that "mirrors" the schema is still a hand edit (`DTO-001`).

shopware/shopware can generate PHP request and response DTOs from its OpenAPI
schema JSON. The schema is the source; the PHP classes follow it. The runtime
maps a JSON request body into the request DTO and turns a returned response
DTO into a validated JSON response.

<!-- TODO: when shopware/shopware#17858 is merged, drop the PR-branch fallback
and the experimental status below, and point at the release that ships the
generator instead. -->

> **Status: experimental.** The generator comes from the draft core PR
> [shopware/shopware#17858](https://github.com/shopware/shopware/pull/17858)
> and is in no release. Before you apply this skill, check that
> `src/Core/Framework/Api/OpenApi/OpenApiDtoGenerator.php` exists in the
> checkout. If it does not, base the work on the PR branch instead of
> inventing the API: `git fetch origin feat/open-api-dto-generator`, then
> branch from `FETCH_HEAD` (ask first when the working tree has changes).
> When the checkout has `src/Core/Framework/Api/OpenApi/AGENTS.md`, that
> file is the contract and leads over this skill.

Only core schema directories are generated. Plugin schemas and plugin
namespaces are not supported yet, so this skill is for core work only.

Read only the reference that matches the task or the files it changes:

<!-- routes:start: generated from routes.json by `node tools/bin/render-routes.ts`; do not edit -->
| Read | When | Or the change touches |
| ---- | ---- | --------------------- |
| [`schema-and-generation.md`](references/schema-and-generation.md) | You add or change an operation that generates DTOs, or touch a generated DTO. | `src/Core/Framework/Api/OpenApi/**`, `src/Core/Framework/Api/Command/OpenApiDtoGenerationCommand.php`, `"x-dto-(namespace\|package\|inline)"`, … |
| [`dto-contract.md`](references/dto-contract.md) | Code reads or fills a generated DTO, or you change the DTO base classes. | `src/Core/Framework/Api/AbstractDto.php`, `src/Core/Framework/Api/Request/**`, `extends Abstract(Dto\|Request\|Response)\b`, … |
| [`route-wiring.md`](references/route-wiring.md) | A controller takes a generated request DTO or returns a generated response DTO. | `#[MapRequestPayload]`, … |
| [`generator-tests.md`](references/generator-tests.md) | You change the generator or its tests and fixtures. | `src/Core/Framework/Api/OpenApi/OpenApiDto*.php`, `tests/unit/Core/Framework/Api/OpenApi/**`, … |
<!-- routes:end -->

## Hard rules

1. Change the schema JSON and regenerate. Never hand-edit a generated DTO
   (`DTO-001`), not even when `bin/console` cannot run. Delete stale DTOs of
   removed operations yourself (`DTO-002`).
2. Required fields are constructor arguments. Optional fields stay
   uninitialized. Business code applies schema defaults through `has()` and
   the `DEFAULT_<FIELD>` constant (`DTO-003`).
3. DTOs stay mutable, and `extensions` is reserved plugin data
   (`DTO-004`, `DTO-005`).
4. A controller takes the request DTO through `#[MapRequestPayload]` and
   returns the response DTO. Status, headers and cookies are set on the DTO
   (`DTO-006`). Path, query and header values do not come from the payload
   (`DTO-007`).

## Commands

Run them in the Shopware checkout, through the project's runner
(`sw-local-dev` for a linked dev checkout):

```bash
bin/console open-api:generate-dtos          # write missing or changed DTOs
bin/console open-api:generate-dtos --check  # write nothing, fail on drift (CI)
```

## Definition of done

- [ ] Schema JSON and generated PHP are in the same commit, and `--check` passes.
- [ ] No DTO of a removed or renamed operation is left behind.
- [ ] Defaults are applied in business code, not in the DTO.
- [ ] The route returns the response DTO; no hand-built `JsonResponse`.
- [ ] A generator change has its own fixture under `_fixtures/<scenario>/`.

## Related skills

- `sw-core-development` owns the core route schema rules (`CORE-008`,
  `CORE-009`) and release notes.
- `sw-security` owns the route's ACL and login defaults.
- `sw-testing` owns general PHPUnit rules; the generator fixture layout is
  here.
