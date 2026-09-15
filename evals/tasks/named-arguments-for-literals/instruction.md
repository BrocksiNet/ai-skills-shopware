# Task: name boolean and null arguments

`SnippetLoader.php` calls `dump()` with `true`, `0`, and `null`. Those
literals do not explain themselves.

- Name those arguments (`strict:`, `limit:`, `fallback:`).
- Leave `count($items)` positional. That call is already self-explaining.
- Keep the public `dump()` signature.
