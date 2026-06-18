# Task: inject repository interface (DAL)

`ProductReader.php` currently type-hints the concrete `EntityRepository` in its
constructor. That violates Shopware DI practice.

Refactor the constructor to inject the **entity-specific repository interface**
for products (`ProductRepositoryInterface` or equivalent DAL repository
interface). Do not inject the generic `EntityRepository` concrete class.

Keep `findById()` behaviour unchanged. Do not add tests.
