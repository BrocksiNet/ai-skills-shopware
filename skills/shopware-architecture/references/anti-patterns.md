# Architectural anti-patterns

Recurring mistakes — see owning references for fixes.

## DAL and data access

- Unbounded `Criteria::search()` on products, orders, customers.
- `Connection` in application services for entity reads/writes.
- Admin repository in Store-API code paths (missing sales-channel context).
- Association filters without `addAssociation()`.

## Layering

- Business logic, DAL orchestration, or branching in controllers.
- Core importing Storefront or Administration classes.
- Plugin editing files under `vendor/shopware/` or `src/Core/` in the platform repo.

## Modernization

- Removing legacy path in the same PR as the new implementation (core).
- Silent behaviour change on decorated services or public routes.
- `Feature::fake()` in unit tests only to activate the current major flag.

## Testing smell

- Behavior-mocking DBAL `Connection` in unit tests (stub collaborators instead).

Graduated evals: `dal-search-without-limit`, `no-dal-connection-for-entity-read`,
`core-http-client-behind-flag`, `business-logic-in-controller`.
