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

- **Split destructive from non-destructive.** Adding goes in `update()`; dropping
  goes in `updateDestructive()`. Never drop data in `update()`.
- **`updateDestructive()` stays small.** No long-running backfills or heavy work
  there either.
- **Large data changes run in batches.** Update about 1,000 rows per statement,
  ordered by a deterministic key such as the primary key, and continue from the
  last key you processed. Without a stable `ORDER BY`, batches skip or repeat rows.
  A single statement over a large table hits the update timeout on big shops.
- **Derived data belongs to an indexer, not to SQL.** Do not recompute hashes,
  keywords or listing values across a whole table in a migration. Register the
  responsible indexer with `registerIndexer()`, or write a `PostUpdateIndexer`
  for a one-time backfill.
- **Idempotent / guarded.** Guard with existence checks (or `IF NOT EXISTS`) so a
  re-run does not fail.
- **Never edit a shipped migration.** Once a migration has been released and run
  on installations, write a new one to change course. Editing it will not re-run
  and breaks new installs vs. existing ones.
- **Bind parameters** for any data values; never interpolate.
- Keep migrations free of service/container logic where possible — they run early.

## Done

- [ ] Class/timestamp naming correct; `getCreationTimestamp()` matches.
- [ ] Destructive changes only in `updateDestructive()`.
- [ ] Guarded/idempotent; parameters bound.
- [ ] No edits to already-released migrations.
