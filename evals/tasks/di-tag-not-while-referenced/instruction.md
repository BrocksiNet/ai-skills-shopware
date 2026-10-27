# Task: review the legacy loader deprecation (core)

You are working on **Shopware core** (`shopware/shopware` trunk). This change
in `Resources/config/services.xml` marks `swag.example.legacy_loader` as
deprecated in favour of `CurrentLoader`.

`LegacyCaller` is not migrated in this PR; that is a follow-up. Review the
change and fix what would block it from merging. Keep the service id and
`LegacyCaller`'s constructor injection as they are.
