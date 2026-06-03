# DAL & performance review findings

Load this when reviewing DAL access patterns or performance-sensitive code.
Seeded from real reviews; grow as findings recur.

## Recurring findings

- **N+1 via per-row association loads.** Looping over results and fetching an
  association per row instead of adding it to the `Criteria` up front.
- **Filtering on an unloaded association.** `EqualsFilter('foo.bar', …)` without
  `addAssociation('foo')`. Works sometimes, surprises often.
- **Over-fetching.** Loading entire association trees "to be safe" on a hot path.
  Request only the fields/associations actually used.
- **Wrong context for storefront reads.** Using the plain `Context` /
  `product.repository` instead of the sales-channel context, so rules/pricing/
  availability are wrong.
- **Raw SQL where the DAL would do.** Dropping to the connection for ordinary
  entity reads/writes, losing events, extensions, and indexing.

## TODO

- TODO: indexer misuse (full reindex on small changes) findings.
- TODO: synchronous heavy work in subscribers that belongs on the message queue.
- TODO: missing cache invalidation after writes (6.7 cache tags).

Owning topic for fixes: `shopware-plugin-development` -> `references/dal-usage.md`
and `references/cache-tags.md`.
