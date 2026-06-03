# Library docs (Context7) & source-verification policy

Load this when the question is about a third-party library/framework Shopware
builds on, or when you need to confirm a version-sensitive detail.

## Use Context7 for library/framework docs

For non-Shopware dependencies — Symfony, Doctrine DBAL/ORM, Vue, Vite, Twig,
Monolog, PSR packages — prefer fetching current docs via Context7 (or the
project's pinned vendor docs) over relying on memory. These APIs change between
versions, and the project may not be on the latest.

Good Context7 targets: "Symfony Messenger handler configuration", "Doctrine DBAL
query builder parameter binding", "Vue 3 composition API for an admin module".

## Version-detection policy (do this first)

1. Read the project's `composer.json` to get the declared ranges
   (`shopware/core`, `symfony/*`, `doctrine/*`).
2. When the exact installed version matters, check `composer.lock` (targeted
   search, not a full read).
3. Pick docs/source that match the installed version. Do not answer from the
   newest docs if the project is pinned older.

## Source-verification policy (Shopware specifically)

- Docs are starting evidence. For behavior-sensitive guidance or any named
  core/admin/storefront symbol, verify against the installed `vendor/shopware/...`
  or the matching stable release tag.
- Never base a change on `trunk`, beta changelog notes, ADR memory, or stale
  docs when a pinned version is available.
- If no version is pinned anywhere, resolve the latest stable release from the
  Shopware changelog/releases and use that tag — not `trunk`.

## Done

- [ ] Library questions answered from version-matched docs (Context7/vendor), not memory.
- [ ] Shopware symbols confirmed in installed source / matching tag.
