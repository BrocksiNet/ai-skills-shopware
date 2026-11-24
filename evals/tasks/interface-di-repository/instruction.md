# Task: inject an existing interface, preserve the DAL repository

`ProductReader.php` injects a concrete Monolog `Logger` alongside Shopware's
`EntityRepository`. Refactor the logger dependency to `Psr\Log\LoggerInterface`.

Keep injecting the concrete `EntityRepository` for `product.repository`: modern
Shopware has no `EntityRepositoryInterface` or product-specific repository
interface to substitute. Do not invent one.

Keep `findById()` behavior unchanged, including logging, found and missing
products, Criteria and context. Do not add tests.
