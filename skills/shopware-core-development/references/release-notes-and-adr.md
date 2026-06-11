# Release notes (RELEASE_INFO / UPGRADE) & ADRs (core)

Load this when a core change needs developer-facing documentation or an
architectural decision record.

**Applies to:** Shopware 6.7.5 and later (post ADR `2025-10-28-changelog-release-info-process`).

Migrated from the former `.cursor/rules/changelog.mdc` in `shopware-trunk`.

## The current process (important: this changed)

Shopware no longer uses hand-written per-change `changelog/_unreleased/*.md`
files. The exhaustive raw changelog for each release is **generated automatically
from semantic PR titles** when a tag is created.

As a contributor you maintain two curated, in-repo files instead:

- `RELEASE_INFO-6.<currentMajor>.md` — developer-facing notes, in the "Upcoming"
  section.
- `UPGRADE-6.<upcomingMajor>.md` — breaking changes and migration steps.

## What goes where

### `RELEASE_INFO-6.x.md` (why developers should care)

- New or reworked user-facing features.
- Developer improvements: new extension points, new/changed best practices,
  guidelines, quality-of-life improvements.
- Critical bugs (especially ones driving a patch release).

Ask: "What does a developer need to know to benefit from this?"

Sections: `Features`, `API`, `Core`, `Administration`, `Storefront`, `App System`,
`Hosting & Configuration`, `Critical fixes`. Each minor version gets its own
section.

### `UPGRADE-6.x.md` (breaking changes)

- Anything that can break projects, extensions, or integrations — every break
  covered by the backward-compatibility promise.
- **Deprecations** — document the planned removal for the next major version.
- Must include: what changed, why/benefit, when developers need to care, how to
  adjust (code snippet or exact steps when needed).

### Update neither (GitHub changelog only)

- Internal refactorings, performance tweaks without external impact.
- Purely internal deprecations.
- Internal storage format changes (browser cookies, localStorage, internal state).

### Public API vs internal

**Public API** (document in RELEASE_INFO or UPGRADE):

- Store API and Admin API endpoints.
- PHP classes/methods without `@internal`.
- Twig blocks, JavaScript events, configuration options.

**Internal** (do not document):

- Browser cookie formats, localStorage structures, internal class state.
- Implementation details of how a feature works.

## Definition of done (per PR)

- [ ] Update `RELEASE_INFO` if the change impacts external developers.
- [ ] Update `UPGRADE` if the change introduces a break or deprecates something.
- [ ] If no external impact: no file update needed (valid).
- [ ] CI checks that `RELEASE_INFO` and/or `UPGRADE` (or neither, if valid) are
  touched when required.

## Ownership

| Step | Owner | Notes |
| ---- | ----- | ----- |
| Write entries | PR author | Part of the PR |
| Curate entries | PR reviewer | Clarity, accuracy, usefulness |
| Structure & quality bar | DevRel + TDM | Consistency, prune hype |
| Verify before tagging | Product Ops | RELEASE_INFO and UPGRADE ready |
| Communicate release | Marketing/Comms | Pulled from curated developer notes |

## The changelog (auto-generated)

- Created by GitHub when tagging a release.
- Lives on the GitHub release page.
- Exhaustive, not curated — may include internal refactorings.
- Complementary: changelog = everything raw; RELEASE_INFO = curated external;
  UPGRADE = breaks and adaptations.

Merchant-facing release news comes from RELEASE_INFO and UPGRADE, not the raw
changelog.

## Formatting rules

- Wrap filenames, config keys, class names, and code elements in backticks.
- Keep only changes visible or relevant to the section audience. Omit
  implementation details that do not affect API or behavior.

## Style guidelines

### RELEASE_INFO

- Simple paragraphs; no bold headers or bullet lists in entries.
- State what is new and what it does; mention new extensibility points if added.
- Usually 1–3 short paragraphs.
- **Never** use bold labels like `**API Change:**`, `**Note:**`, `**Breaking:**`.

### UPGRADE

- No bold labels like "What changed:", "Why:", "Impact:", "How to adjust:".
- Plain paragraphs: what changed → who is affected → new extensibility points.
- Code examples only when necessary for clarity.

### Avoid duplication

- Deprecations go only in UPGRADE, not RELEASE_INFO.
- Each file stands alone — no cross-references needed.

## Deprecations across the lifecycle

When you introduce a deprecation (minor), document the alternative and timeline
in RELEASE_INFO. When the break lands (major), document migration in UPGRADE.

## ADRs

Add an Architecture Decision Record under `adr/` for decisions future maintainers
should understand: a new pattern, a trade-off, or a deviation from convention.
State context, options, decision, consequences. Mechanical changes do not need
an ADR.

## Commits

Conventional commits, scoped to the affected area. The title feeds the
auto-generated changelog:

```text
feat(Checkout): add CacheTagCollector support to product route
fix(Administration): correct sw-data-grid selection reset
```

## Reviewer checklist

- [ ] Entry is clear, concise, factual — no hype.
- [ ] Correct file: RELEASE_INFO vs UPGRADE.
- [ ] External impact explained.
- [ ] Breaking changes include what / why / when / how to fix.
- [ ] Links provided if extra context helps (PR, docs).

## Templates

### RELEASE_INFO entry shape

```markdown
## 6.7.x (Upcoming)
### Core
- Added `CartRoute` parameter `guestLogin` so headless clients can ... (PR #12326)
```

### UPGRADE entry shape

```markdown
## Removal of deprecated feature/class

Class `Shopware\Models\Order\OldOrder` was removed.

If your plugin uses `OldOrder`, it will fail after upgrading to 6.8.0.0.

Migrate to `Shopware\Core\Checkout\Order\OrderEntity` instead.
```

## Examples

**Good RELEASE_INFO** — factual, mentions extensibility:

```markdown
### Storefront

When the `v6.8.0.0` feature flag is active, the language selector now displays
language names with territory (e.g. "Deutsch (Deutschland)").

New extensible Twig blocks `layout_header_actions_language_widget_content_inner`
have been added for custom flag implementations.
```

**Bad RELEASE_INFO** — hype, cross-references, over-formatted.

**Good UPGRADE** — plain paragraphs, who is affected, alternative.

**Bad UPGRADE** — vague, over-structured with bold labels and tutorial code.

## Done

- [ ] Developer-facing change in `RELEASE_INFO-6.x.md` (Upcoming).
- [ ] Breaking change in `UPGRADE-6.x.md` with migration steps.
- [ ] Internal-only refactor / minor fix: no entry, but a clear PR title.
- [ ] ADR added if the decision is architectural.
