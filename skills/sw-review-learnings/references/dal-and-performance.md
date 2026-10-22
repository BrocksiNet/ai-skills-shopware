# DAL & performance review findings

Load this when reviewing DAL access patterns or performance-sensitive code.
Seeded from real reviews; grow as findings recur.

## Recurring findings

- **REV-021** **N+1 via per-row association loads.** Looping over results and fetching an
  association per row instead of adding it to the `Criteria` up front.
- **Filtering on an unloaded association.** `EqualsFilter('foo.bar', …)` without
  `addAssociation('foo')`. Works sometimes, surprises often.
- **REV-022** **Over-fetching.** Loading entire association trees "to be safe" on a hot path.
  Request only the fields/associations actually used.
- **REV-023** **Wrong context for storefront reads.** Using the plain `Context` /
  `product.repository` instead of the sales-channel context, so rules/pricing/
  availability are wrong.
- **REV-024** **Raw SQL where the DAL would do.** Dropping to the connection for ordinary
  entity reads/writes, losing events, extensions, and indexing.
- **REV-033** **Inline fallback for queued work.** A subscriber or controller dispatches a
  message, and when dispatch fails or no transport is configured it runs the
  heavy work synchronously in the request instead. The fallback is the path
  that runs on the shops where the queue is broken, so the request times out
  exactly where it hurts. Subscribers only dispatch; the handler does the
  work; a failed dispatch fails loudly or is retried by the transport.

## TODO

- TODO: indexer misuse (full reindex on small changes) findings.
- TODO: missing cache invalidation after writes (6.7 cache tags).

Owning topic for fixes: `sw-plugin-development` -> `references/dal-usage.md`
and `references/cache-tags.md`.
