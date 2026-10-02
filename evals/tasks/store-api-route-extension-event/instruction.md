# Task: new Store API route uses an extension event

`ProductBadgeRoute` is a new core Store API route. It was sketched as an
abstract route plus `getDecorated()`, which is the old pattern.

Rewrite it so plugins extend it through a typed extension event
(`ExtensionDispatcher`), not a new abstract route class. Do not leave
`AbstractProductBadgeRoute`.
