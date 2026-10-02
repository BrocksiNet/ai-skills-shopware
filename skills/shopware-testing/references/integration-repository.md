# Integration repository tests

Inspired by [FriendsOfShopware shopware-phpunit](https://github.com/FriendsOfShopware/agent-skills/tree/main/skills/shopware-phpunit)
(`integration-repository-testing`); rewritten for this repo.

- Use only the integration traits the scenario needs. A repository test that
  only needs the service container and a rolled-back transaction uses
  `KernelTestBehaviour` and `DatabaseTransactionBehaviour`. Do not pull in
  `IntegrationTestBehaviour` when sales channel, cache, or the request stack
  are unused. Use the broader bundle when the scenario actually needs it.
- Create **your own** entities with `Uuid::randomHex()`; never assert against
  "whatever is already in the DB".
- Use `Context::createDefaultContext()` unless the test needs a sales channel /
  language scope.
- Search with `Criteria` filtered to the ids you created.

```php
final class ProductRepositoryTest extends TestCase
{
    use KernelTestBehaviour;
    use DatabaseTransactionBehaviour;

    public function testCreateAndRead(): void
    {
        $repository = static::getContainer()->get('product.repository');
        $context = Context::createDefaultContext();
        $id = Uuid::randomHex();

        $repository->create([['id' => $id, /* minimal required fields */]], $context);

        $found = $repository->search(new Criteria([$id]), $context);
        static::assertCount(1, $found);
    }
}
```

For richer product/customer fixtures in **plugins**, see FoS
`data-product-builder` and `data-test-fixtures` references in
[`external-inspiration.md`](external-inspiration.md).
