Hi,

one plugin version for both is fine as long as your code only uses APIs that
exist in 6.6 and 6.7. Widen the constraint to
`"shopware/core": "~6.6.0 || ~6.7.0"` and run your tests against both.

Your subscriber should keep working, but check it on a 6.7 install. Changes
to custom fields in `product.loaded` only live in memory for that request,
and the event fires on every product load, so keep the work in there cheap.

Write the migration so it can run twice: check that the column is missing
before the `ALTER TABLE`. Use `executeStatement()` rather than the old
`executeUpdate()`, which newer DBAL versions removed.

Fix every deprecation notice your plugin triggers on 6.6 first. 6.7 removed
much of that code, so those notices are the best list of what will break.

Ship two plugin versions only when the code has to branch on the Shopware
version.
