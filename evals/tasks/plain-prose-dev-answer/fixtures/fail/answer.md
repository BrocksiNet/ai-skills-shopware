Hi,

one plugin version for both is fine as long as your code only uses APIs that
exist in 6.6 and 6.7.

- **Composer:** widen the constraint to `"shopware/core": "~6.6.0 || ~6.7.0"`
  and run your tests against both.
- **Subscriber:** it should keep working, but check it on a 6.7 install.
  Changes to custom fields in `product.loaded` only live in memory for that
  request, so keep the work in there cheap.
- **Migration:** make it safe to run twice, and use `executeStatement()`
  rather than the old `executeUpdate()`.
- **Deprecations:** fix every notice your plugin triggers on 6.6 first.

Ship two plugin versions only when the code has to branch on the Shopware
version.
