# Task: do not deprecate a DI id core still uses

`services.xml` marks `swag.example.legacy_loader` as `<deprecated>` while
`LegacyCaller.php` still injects that id.

- Remove the DI `deprecated` attribute while the core caller remains.
- Keep the service id and the PHP constructor injection.
- Do not add `@deprecated` on the XML definition until the last core
  reference is gone.
