# Database migrations (plugin/app)

Load this when adding or changing a database migration.

## Shape

Migrations extend `Shopware\Core\Framework\Migration\MigrationStep`. The class
name is `Migration<unixtimestamp><Description>` and `getCreationTimestamp()`
returns that timestamp.

```php
class Migration1700000000AddExampleColumn extends MigrationStep
{
    public function getCreationTimestamp(): int
    {
        return 1700000000;
    }

    public function update(Connection $connection): void
    {
        // Non-destructive: add tables/columns, backfill.
        $connection->executeStatement(
            'ALTER TABLE `swag_example` ADD COLUMN `note` VARCHAR(255) NULL'
        );
    }

    public function updateDestructive(Connection $connection): void
    {
        // Destructive: drop columns/tables. Runs only when destructive
        // migrations are explicitly enabled.
    }
}
```

## Rules

- **PLG-017** **Split destructive from non-destructive.** Adding goes in `update()`; dropping
  goes in `updateDestructive()`. Never drop data in `update()`.
- **PLG-030** **`update()` never narrows.** Shortening a column, changing it to a
  smaller type, adding `NOT NULL` without a default, or dropping a default
  breaks writes from code that is still on the old version during a blue-green
  or rolling update. Those changes go in `updateDestructive()`. Adding a
  nullable column or widening a type stays in `update()`.
- **PLG-018** **`updateDestructive()` stays small.** No long-running backfills or heavy work
  there either.
- **PLG-019** **Large data changes run in batches.** Update about 1,000 rows per statement,
  ordered by a deterministic key such as the primary key, and continue from the
  last key you processed. Without a stable `ORDER BY`, batches skip or repeat rows.
  A single statement over a large table hits the update timeout on big shops.
- **PLG-020** **Derived data belongs to an indexer, not to SQL.** Do not recompute hashes,
  keywords or listing values across a whole table in a migration. Register the
  responsible indexer with `registerIndexer()`, or write a `PostUpdateIndexer`
  for a one-time backfill.
- **PLG-021** **Idempotent / guarded.** Guard with existence checks (or `IF NOT EXISTS`) so a
  re-run does not fail.
- **PLG-022** **Never edit a shipped migration.** Once a migration has been released and run
  on installations, write a new one to change course. Editing it will not re-run
  and breaks new installs vs. existing ones.
- **PLG-023** **Bind parameters** for any data values; never interpolate.
- **PLG-028** **Leave merchant edits alone.** A migration that changes shipped content
  (mail templates, flows, CMS pages, snippets, system config defaults) only
  touches rows the merchant has not edited: guard with `updated_at IS NULL`,
  or compare against the value you shipped before. Overwriting an edited
  template silently undoes the merchant's work.
- **PLG-029** **No feature flags in migrations.** `Feature::isActive()` and
  `Feature::has()` are evaluated once, when the migration runs, and the result
  is frozen into the schema. Shops that switch the flag later never get the
  other branch. Migrate unconditionally and branch on the flag in the code
  that reads the data.
- Keep migrations free of service/container logic where possible — they run early.

## Done

- [ ] Class/timestamp naming correct; `getCreationTimestamp()` matches.
- [ ] Destructive or narrowing changes only in `updateDestructive()`.
- [ ] Content updates skip rows the merchant edited; no feature flags.
- [ ] Guarded/idempotent; parameters bound.
- [ ] No edits to already-released migrations.
