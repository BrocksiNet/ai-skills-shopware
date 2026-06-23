# Service architecture and public surface (core)

Load when adding or refactoring PHP services, controllers, loaders, or value
objects in shopware/shopware. Complements
[`platform-architecture.md`](platform-architecture.md) (bundle boundaries, events,
migrations).

## Hexagonal layout

- Keep **application/domain services hexagonal**: controllers, CLI commands,
  subscribers, and handlers translate infrastructure (`Request`, IO, database,
  filesystem, HTTP) into plain inputs before calling services.
- Services must **not** perform direct infrastructure work or depend on framework
  objects. Depend on narrow abstractions: repositories, filesystem interfaces,
  HTTP clients, gateways.
- Services must be **unit-testable without external systems**; test infrastructure
  adapters with integration tests.
- Mark infrastructure adapters **`@internal` by default**.

## Classes, final, and internal

- Mark supported/public concrete classes **`@final`** when they are not intended
  for extension.
- Use a real **`final class`** for simple value objects/structs that do not need
  extension, decoration, or mocking; use `@final` on supported services when tests
  or framework mechanics may still need to subclass/mock them.
- Do **not** add `@final` to classes already marked `@internal` — internal is
  enough for implementation details.
- Do **not** repeat `@internal` on constructors or methods inside an
  `@internal` class.

## Extension vs new abstractions

- Prefer **existing Shopware extension mechanisms** over new provider interfaces
  when they already express the contract: Twig inheritance, DAL entities, Admin
  API routes, explicit Twig blocks.

## DTOs and value objects

- Be **conservative with DTOs/value objects**. Add one only when it expresses a
  meaningful domain concept, crosses a real boundary, or simplifies a public
  contract.
- Prefer scalars or arrays for simple internal data; do **not** create DTOs solely
  to model private handoffs inside one class.
- For transparent struct-style value objects, prefer **public readonly properties**
  over private properties plus trivial getters.

## Public BC surface

For new feature designs, explicitly separate the **BC-promised public surface**
from internal implementation:

- Document public REST/Admin/Store API contracts, DAL entities, template context,
  and supported extension points.
- Mark controllers, subscribers, loaders, renderers, and discovery services
  `@internal` unless they are intended extension points.
- The HTTP route contract can be **public** even when the PHP controller class is
  internal — document those separately.
