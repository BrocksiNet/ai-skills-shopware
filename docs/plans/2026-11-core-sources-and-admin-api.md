# Core sources, local environments, MCP and the admin API index

Status: **accepted 2026-11-11.** Nothing here is started. Decisions are at
the end.

## Summary

Core keeps more agent guidance than our drift issue reads: 11 skills in
`.agents/skills`, nested `AGENTS.md` files, lint configs, BCChange metadata
and the `sw-impact` breaking-change check in its CI. This plan takes what
helps our skills from it, in six work packages:

| WP | What | Size |
| -- | ---- | ---- |
| A | Read more of core in the weekly drift issue | small |
| B | `sw-local-dev`: local environments beyond Podman | medium |
| C | Admin API index: the surfaces plugins use that we do not record yet | large |
| D | Check the API index against `sw-impact` | medium |
| E | Admin rules for plugin authors and reviewers | medium |
| F | `sw-mcp-development`: plugins that add MCP tools | medium |

One rule holds for C and D: **the API index stays ours.** We build it, we
change it, and no skill or tool depends on another tool at run time.
`sw-impact` is something we compare against to find our misses; it never
replaces a source.

## WP A: read more of core in the drift issue

Today `rules/sources.json` reads seven of core's 11 skills, the root and
Administration `AGENTS.md`, `coding-guidelines/`, `StaticAnalyze` and the
PR template.

1. **Map the unmapped core skills.** They are under `.agents`, so the drift
   issue reads them, but no skill owns their changes.
   - `sw-bugfixer` → `sw-research-and-escalation`, `sw-change-impact`
   - `shopware-knowledge-capture` → `sw-core-development`
   - `sw-triage`, `nightly-triage` → ignored on purpose (we have no triage
     skill). Check how `mine-trunk.ts` reports an unmapped path, and add an
     explicit ignore if they would show up as unowned every week.
2. **Read the nested `AGENTS.md` files.**
   - Administration `src/app`, `src/core`, `src/module` → `sw-admin-js`
   - `.github/AGENTS.md` → `sw-pr-description`
   - `Framework/Mcp/**/AGENTS.md`, `Storefront/Mcp/AGENTS.md` →
     `sw-mcp-development` (WP F); unmapped until that skill exists.
3. **Read the check configs behind `trunk.enforced_by`**: Admin and
   Storefront ESLint configs, Stylelint (SCSS), Twig lint and translation
   lint. A rule we list as "already enforced" goes stale when such a config
   drops the check, and today nobody notices.
4. **Read the skill-authoring policy and the shared-guidance ADR**: the ADR
   for `sw-core-development`, the policy for this repo's own authoring
   conventions (`docs/skill-resolution.md` depends on core and us writing
   skills the same way).
5. **Local environment templates** (DDEV, Docker, native, Vagrant) →
   `sw-local-dev` (WP B).

Each new path gets a `/mined` start state, so the first issue does not dump
the whole history.

Done when: `node tools/bin/mine-trunk.ts` over the last 30 days files every
new path under a skill or an explicit ignore, and `validate-skills.sh`
passes.

## WP B: `sw-local-dev`

`sw-podman-dev` is one personal setup. Core ships four environment
templates, and most plugin developers use DDEV or Docker.

1. New skill `sw-local-dev`. `SKILL.md` holds the shared part: where `php`,
   `composer`, `bin/console` and `npm` run, how to reach the database, how
   to run one test. One reference per environment: Podman (moved from
   `sw-podman-dev`), DDEV, Docker, native, Vagrant. The Shopware CLI
   routing reference moves along.
2. Detect the environment from files (`.ddev/`, `compose.yaml`,
   `Vagrantfile`, the Podman setup) with `routes.json` `paths_any`.
3. `sw-podman-dev` stays for one release as a thin pointer to
   `sw-local-dev`, then goes. Update `README.md`, `use-cases/` and
   `sw-help`.
4. Activation prompts per environment, and one behavioral task per
   environment that grades the command the agent runs (`expect-tool`).
5. Map the four core templates and `shopware-cli`'s skills to it in
   `sources.json`.

Done when: activation picks the right reference for each of the five
environments, and the existing Podman tasks still pass.

## WP C: admin API index, the missing surfaces

Our admin surface (`tools/api-index/src/admin.ts`) records components,
props, methods, emits, slots, blocks with their parent, position
identifiers and the `Shopware` global. Plugins also depend on these, by
name only, so a removal breaks them without a build or test failing:

| Gap | Why it matters |
| --- | -------------- |
| Two flag states (major flag off and on) | Breaks behind the major flag stay invisible until the major ships; core PR 17339 renamed bulk-edit blocks only with the flag on |
| SCSS variables and mixins | A missing `~scss/variables` name fails the plugin build |
| Snippet keys with placeholders and plural forms | A renamed placeholder breaks `$t` calls |
| Template refs and static CSS classes | A missing ref breaks a plugin; a missing class only restyles it |
| Block context: open `v-if` chain, `v-for` and slot variables | Core PR 20959 dropped `itemIndex` from a slot and broke overrides |
| Elements and `v-if` chains that cross blocks | Overriding the inner block without `{% parent %}` breaks the markup (core PR 20959, fixed in 21189) |
| Inherited blocks of public children of `@private` bases | Plugins override them by the child's name |
| Filters, directives, ACL privileges, registries, event bus events | Used as strings; a removal breaks silently |
| Routes and modules, mixins, inject, services and store members | Same |

Steps:

1. **Flag states first.** Evaluate `Feature.isActive` checks in scripts and
   templates twice; an item that exists in only one state carries a version
   marker (`until v6.8.0`, `from v6.8.0`) rather than "current" / "major",
   which lose their meaning in an old index.
2. One new `ItemKind` per row above, one PR each, each with `api-diff`
   classification and a `facts` lookup.
3. Acceptance cases in the `tools/api-index` tests, with expected findings
   we write from the real commits: core PRs 20959, 17339 and 15271, and a
   small bug fix as negative control (no finding). Two runs on the same
   commit give byte-identical output.

Done when: the acceptance cases pass for the surfaces we cover, and
`api-changes` over the last four weekly indexes shows no new noise.

## WP D: check the API index against `sw-impact`

`sw-impact` already runs in core CI as an advisory check. We use the output
it produces there instead of installing it, and decide later whether we
need more.

1. Find where core CI publishes it (annotations, JSON artifact) and fetch
   it for recent merged core PRs with `gh`.
2. Run `api-diff` on the same base and head, match findings by symbol, and
   list: found by both, only `sw-impact` (our miss: a bug or a surface we
   lack), only us (their miss or our false alarm, checked by hand).
3. The matching lives in `tools/api-index/bin/cross-check.ts` with a small
   mapping table from their element names to our ids. The index and the
   skills never see their names; if they rename, only the table changes.
4. Run by hand or monthly, never in the index build. The output stays in a
   git-ignored folder; a recall number per surface shows WP C's progress.
5. The index already records BCChange attributes in `flags.bcChanges`. Use
   their kind (`CallSiteCompatibilityChange`, `ExtenderCompatibilityChange`)
   to say who has to act, callers or extenders, in `api-facts` and
   `api-diff`, and compare with `sw-impact`'s classification.

Done when: one cross-check run is written up here with the miss lists, and
each miss is an issue or an accepted difference.

## WP E: admin rules for plugin authors and reviewers

Candidates for `sw-admin-js` (author side) and `sw-extension-review`
(review side), each with the usual catch/ignore review pair:

- An override that replaces a block without `{% parent %}` where the core
  block has a crossing element or continues a `v-if` chain.
- An override template that uses a slot or loop variable the block does not
  provide.
- An override that defines a method the target no longer has (a silent
  rename in core), or calls `$super` on a name that does not exist.
- `$parent` access and imports from core `src/` in a plugin.
- Reading core `$refs` or styling core classes: warn, not block.
- Core side (`sw-core-development` or the admin skill on trunk): adding an
  element that crosses blocks, moving a block under a new parent, removing
  a slot variable, renaming a block only behind the major flag without
  `@deprecated`.

Each rule needs the five inclusion criteria and an eval before it lands.
Where the index (WP C) has the fact, the review skill calls `shopware-api`
instead of guessing.

## WP F: `sw-mcp-development`

Plugins already add tools to Shopware's MCP server, and the API still moves,
so this skill needs frequent updates. Built so the drift issue tells us
when.

1. Sources: core's `Framework/Mcp/**/AGENTS.md` (Tool, Loader, Prompt,
   Command, Context, Resource) and `Storefront/Mcp/AGENTS.md`, mapped to the
   skill in `sources.json` (WP A step 2). Every change there lands in the
   weekly drift issue under this skill.
2. Scope: a plugin that registers MCP tools, prompts or resources;
   permissions and ACL of a tool; input and output schemas; testing a tool.
   Not: running or configuring the server for a shop (that is a runtime
   question, not code).
3. Mark it experimental in the description and `REGISTRY.md`, like
   `sw-openapi-dto`, with the core version it was written against.
4. API index: add the MCP extension points (tool attributes, interfaces,
   service tags) as a surface, so `api-diff` reports their changes and the
   skill can check a plugin against a version.
5. Rules with IDs (new prefix), each with an eval; activation prompts;
   router metadata; `sw-help`.

Done when: activation evals pass, each rule has an eval, and one drift
issue shows an MCP change filed under the skill.

## Order

1. A (small, more drift signal; also sets up F's sources)
2. B
3. C step 1 (flag states) together with D steps 1 to 3 (cross-check), since
   the misses tell us which C rows matter most
4. F (needs A; can run in parallel with C)
5. The rest of C, then E

## Decisions

Answered 2026-11-11:

1. **Plan scope:** this public plan describes our index and its gaps only;
   unmerged core designs are linked once they land on trunk.
2. **MCP:** build `sw-mcp-development` (WP F) now; plugins already add MCP
   tools.
3. **Local environments:** new `sw-local-dev`; `sw-podman-dev` stays one
   release as a pointer.
4. **`sw-impact`:** use the output core CI already produces; no install for
   now, decide later.
5. **Element names:** our index keeps its own ids; other tools' names only
   appear in the cross-check mapping table.
6. **Core triage skills:** ignored on purpose in the drift issue.
