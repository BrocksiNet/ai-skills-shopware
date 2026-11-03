# Wiring a route to generated DTOs

Load when a core controller takes a generated request DTO or returns a
generated response DTO.

Generating a DTO registers no route and no service. Register the controller
the normal Shopware way (`CORE-008` for its schema, `sw-security` for its
access).

## What the runtime does

`DTOResponseListener` handles a returned `AbstractResponse` on `kernel.view`.
It dispatches `<route-name>.encode` so extensions can change the DTO,
validates the DTO, serializes it with `DtoNormalizer`, replaces media and SEO
URL placeholders and builds the `JsonResponse`. An invalid response DTO
raises a constraint violation with HTTP 500.

## Rules

- **DTO-006** Take the generated request with `#[MapRequestPayload]` and
  return the generated response DTO from the controller. Do not build a
  `JsonResponse` or serialize the DTO yourself; that skips the `.encode`
  event, the response validation and the URL replacement. Set HTTP metadata on
  the DTO with `setStatusCode()`, `setHeader()` and `addCookie()`.

  ```php
  public function create(
      #[MapRequestPayload] CreateExampleRequest $payload,
  ): CreateExampleResponse {
      $response = new CreateExampleResponse(name: $payload->name);
      $response->setStatusCode(Response::HTTP_CREATED);

      return $response;
  }
  ```

- **DTO-007** Do not count on `#[MapRequestPayload]` to fill a path or query
  property of a generated request DTO: extracting parameters at generation
  time and mapping the HTTP request are separate steps. Header parameters are
  not generated at all. Read those values as route
  arguments, with `#[MapQueryParameter]` or from the `Request`, and assign
  them yourself when the DTO needs them.

Wrap the business logic in `ExtensionDispatcher::publish()` as other Store API
routes do. The newsletter example is
`src/Core/Checkout/Customer/SalesChannel/AccountNewsletterRecipientV2Route.php`.

## Open in the draft

- Request validation errors do not match the existing Store API error body
  yet, and unknown request fields have no decided behavior
  ([shopware/shopware#21687](https://github.com/shopware/shopware/issues/21687)).
- DTO responses do not support `includes`, `apiAlias`, entity collections or
  criteria. That is intended: DTOs are the API boundary and are not mapped
  from the DAL.
