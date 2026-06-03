# DAL usage (plugin/app/project)

Load this when reading or writing entity data through Shopware's Data
Abstraction Layer.

## Reads: Criteria

- Inject the `EntityRepository` for the entity (e.g. `product.repository`), not
  the connection.
- **Add an association before you filter or sort on it.** Filtering on a nested
  field without `addAssociation()` is the single most common DAL mistake.

```php
$criteria = new Criteria();
$criteria->addAssociation('manufacturer');
$criteria->addFilter(new EqualsFilter('manufacturer.name', $name));
$criteria->setLimit(50);

$products = $this->productRepository->search($criteria, $context)->getEntities();
```

- Request only what you need: limit fields/associations; use `addFilter`,
  `addSorting`, pagination. Avoid loading whole association trees "just in case".
- Avoid N+1: load associations in the criteria instead of looping and fetching
  per row.
- Use the **sales-channel** repository/context (`SalesChannelContext`) for
  storefront/store-API reads so rules, availability, and pricing apply.

## Writes

- Use `create()`, `update()`, or `upsert()` with payload arrays keyed by field
  name and the correct `Context`.
- `id`s are hex `Uuid::randomHex()`. Translations go under `translations` /
  per-language keys.
- Wrap multi-entity writes in the same `Context`; use `sync` for bulk where
  appropriate.

## Raw SQL: last resort

Only drop to `Doctrine\DBAL\Connection` for bulk/performance work the DAL cannot
express. When you do: bind parameters (never interpolate), and document why.

## Done

- [ ] Repository (not raw SQL) used for entity data.
- [ ] Associations added before filtering/sorting on them.
- [ ] Criteria scoped (limit, needed fields/associations only); no N+1.
- [ ] Sales-channel context used for storefront/store-API reads.
