# Task: fix the planned change on LegacyIdLoader (core)

You are working on **Shopware core** (`shopware/shopware` trunk).
`LegacyIdLoader.php` announces with `@deprecated reason:` that `$id` will
become `string` in v6.8.0.

Core review rejected this: it is not how trunk records a planned break for the
next major. Fix it so the planned change is recorded the way trunk expects.
The current `string|int $id` signature must stay callable.
