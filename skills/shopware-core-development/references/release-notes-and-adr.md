# Release notes (RELEASE_INFO / UPGRADE) & ADRs (core)

Load this when a core change needs developer-facing documentation or an
architectural decision record.

## The current process (important: this changed)

Shopware no longer uses hand-written per-change `changelog/_unreleased/*.md`
files. That workflow was superseded by the "Changelog & Release Info Process"
(ADR `2025-10-28`). The exhaustive, raw changelog for each release is now
**generated automatically from the semantic PR titles** when a tag is created.

As a contributor you maintain two curated, in-repo files instead:

- `RELEASE_INFO-6.<currentMajor>.md` — developer-facing notes, in the "Upcoming"
  section.
- `UPGRADE-6.<upcomingMajor>.md` — breaking changes and migration steps.

## What goes where

**`RELEASE_INFO-6.x.md`** (the "why developers should care"):

- New or reworked user-facing features.
- Developer improvements: new extension points, new/changed best practices or
  guidelines, quality-of-life improvements for other developers.
- Deprecations you introduced (document the alternative and the timeline).
- Critical bugs (especially the ones driving a patch release).

It does **not** include internal refactors or backwards-compatible "under the
hood" improvements.

**`UPGRADE-6.x.md`**: anything that can break projects, extensions or
integrations — every break covered by the backward-compatibility promise.

## When you do NOT document explicitly

Non-critical bug fixes and internal refactorings need no entry. They are covered
by the auto-generated raw changelog built from PR titles. So write a clear,
conventional PR title regardless.

## Entry shape

Group by area heading and keep it about the *why*:

```md
## 6.7.5 (Upcoming)
### Core
- Added `CartRoute` parameter `guestLogin` so headless clients can ... (PR #12326)
```

Areas: `Features`, `API`, `Core`, `Administration`, `Storefront`, `App System`,
`Hosting & Configuration`.

## Deprecations across the lifecycle

When you introduce a deprecation (in a minor), document the alternative and the
timeline in `RELEASE_INFO`. When the break actually lands (in a major), document
the migration in `UPGRADE`.

## ADRs

Add an Architecture Decision Record under `adr/` when you make a decision future
maintainers should understand: a new pattern, a trade-off between approaches, or
a deviation from a convention. State context, options, decision, consequences.
Mechanical or obvious changes do not need an ADR.

## Commits

Conventional commits, scoped to the affected area. The title feeds the
auto-generated changelog, so make it descriptive:

```text
feat(Checkout): add CacheTagCollector support to product route
fix(Administration): correct sw-data-grid selection reset
```

## Done

- [ ] Developer-facing change captured in `RELEASE_INFO-6.x.md` (Upcoming).
- [ ] Breaking change captured in `UPGRADE-6.x.md` with migration steps.
- [ ] Internal-only refactor / minor fix: no entry, but a clear PR title.
- [ ] ADR added if the decision is architectural.
