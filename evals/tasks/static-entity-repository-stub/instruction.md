# Task: stub the DAL with StaticEntityRepository

`ProductLoaderTest.php` mocks `EntityRepository`. Shopware unit tests
should use `StaticEntityRepository`.

- Replace the mock with `StaticEntityRepository::of(ProductCollection::class, ...)`.
- Do not `createMock(EntityRepository`.
- Keep the public `load()` assertion.
