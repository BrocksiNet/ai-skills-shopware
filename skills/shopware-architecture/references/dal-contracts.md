# DAL public contract vs internals

Load when reading/writing entity data or tempted to “reach into” the DAL.

## Public surface (default)

- `EntityRepository` + `Criteria` (filters, associations, sorting, aggregations,
  `setLimit`, pagination).
- Correct `Context` / `SalesChannelContext` for the layer (storefront reads use
  sales-channel repositories).
- `EntityWriter` / sync payloads only for documented bulk writes.

## Anti-patterns

| Mistake | Fix |
| ------- | --- |
| `search()` with **no limit** on catalog entities | `setLimit()` + pagination; document export-only exceptions |
| Raw `Connection->fetch*` for entity CRUD | Repository + Criteria |
| Filter on association without `addAssociation()` | Add association first |
| N+1 loops calling repository per row | Load association in Criteria |
| Plugin subclassing core `EntityDefinition` | Entity extension / custom fields |

## Internals (core-only, strong reason)

Avoid in plugins and project code:

- Bypassing validation via direct `DefinitionInstanceRegistry` hacks.
- SQL that duplicates translation, versioning, or indexer invariants.
- Reading arbitrary tables without entity definitions.

On **core**, if independence requires a new read path, add a **narrow port**
(service that wraps Criteria) instead of exposing registry lookups.

## Progressive enhancement

Replacing a raw SQL report with DAL: ship DAL path behind flag; keep SQL branch
until verified equivalent; remove in major.

See eval: `dal-search-without-limit`, `no-dal-connection-for-entity-read`.
