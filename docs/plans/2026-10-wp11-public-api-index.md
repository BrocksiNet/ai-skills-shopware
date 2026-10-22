# WP11, rethought: a public API index of Shopware

Status: **draft, waiting for review.** Replaces the Kev experiment in
[WP11 of the skills evolution plan](2026-10-skills-evolution.md#wp11-public-api-index).
Nothing here is built yet. The decisions at the end need an answer before
phase 0 starts.

## Summary

WP11 builds an **index of Shopware's public API, per release**, from the
public `shopware/shopware` repository, and two small tools on top of it:

- **`api-facts`**: "this extension supports 6.6 and 6.7; which API it uses
  is missing, deprecated or internal somewhere in that range?"
- **`api-diff`**: "does this pull request break public API?", for every
  surface an extension relies on, not only PHP signatures.

The Kev experiment is dropped. It was already measured for triage in
[shopware/framework-team#120](https://github.com/shopware/framework-team/pull/120),
and those numbers say the facts are the bottleneck, not the model. The
[codebase census](https://github.com/shopwareLabs/codebase-census) is
private and has no `@internal` or `@deprecated` flags; it stays an
optional cross-check, not a source.

## Why facts, not a classifier

WP6 showed that the review skill wins where the answer is a version or API
fact the model does not know: ADM-044, PLG-007, SF-009 and ADM-009 won the
A/B, and each turned on "this exists in that version" or "that changed in
6.x". #120 found the same from the other side:

| Finding in #120 | What it means here |
| --------------- | ------------------ |
| Kev-4B: 61 %, 131 of 600 answered `unclear` | the small model is not usable for choices |
| Kev-9B: 75.7 %, about 6 s per question set | as good as the hosted model, far too slow for a routing step |
| `Size` and `effort` lost to a two-line rule | judgement questions often lose to a rule |
| Fan-in vs effort: Spearman −0.02 | "many callers, so a big change" is not true by default |
| Duplicates: the model was right on 86–91 % of what search found; search found 41–81 % | finding the facts was the bottleneck |
| Twelve decisions reasoning made, measurement reversed | nothing ships on reasoning alone |

The Kev routing experiment would answer one question (`change-scope.md`),
against labels nobody has recorded, at seconds per call. It is not worth
running.

## What "public API" means

Shopware's backward compatibility promise decides what is in the index and
what a break is. Each surface records the status flags that change the
answer: `internal`, `deprecated` (with the version it goes away), `final`
and `experimental`.

| Surface | Items | Source in `shopware/shopware` | How it is read |
| ------- | ----- | ----------------------------- | -------------- |
| PHP | classes, interfaces, traits, enums; public and protected methods with parameters and return types; public constants | `src/**/*.php` | `php-parser` AST, docblocks and attributes for the flags |
| Events | event classes and the event name constants (`*Events.php`) | PHP | part of the PHP surface |
| Store API and Admin API | path, method, route name, scope; whether the OpenAPI schema has the path | `#[Route]` attributes, `Schema/**/paths` | AST plus JSON |
| Entities | entity names, fields and their flags (`ApiAware`, `Required`), associations and `autoload` | `*Definition.php` `defineFields()` | AST, best effort (see risks) |
| Admin UI | component names (`Component.register/extend`), twig block names per component template, `position-identifier` values of the extension API, the `Shopware.*` global | `src/Administration/Resources/app/administration/src` | `@babel/parser` and a twig block scan |
| Storefront | twig block names per template, JS plugin names (`PluginManager.register`) | `src/Storefront/Resources` | twig block scan, `@babel/parser` |
| Configuration | feature flags (`feature.yaml`), `shopware.yaml` keys and defaults, `config-schema.json` | YAML and JSON | plain parse |

Which admin and storefront items Shopware promises to keep is decided per
surface in phase 0 from the developer documentation and the ADRs (for
example the 2021 admin extension API standard). The index records them all;
the tools only report what the promise covers, and say which promise.

### What core already checks

Core CI runs `composer bc-check`
([Roave BackwardCompatibilityCheck](https://github.com/Roave/BackwardCompatibilityCheck),
patched to honour `@final` and skip experimental code). PHP signature
breaks in a core PR are caught there. `api-diff` does not repeat it in CI
terms; its value for core PRs is the surfaces Roave cannot see: routes,
entity API shape, admin and storefront extension points, flags and config.
Those are exactly the cases of `CORE-066` to `CORE-071`, which say today
that "no BC check notices the change". For extensions, there is no BC
check at all, so the PHP surface is the main value.

## The data

### One timeline file, not a snapshot per tag

The generator runs once per release tag and merges the results into one
file, `api-index.json.gz`. Each item lists the releases it exists in, as
ranges, and the release in which each flag appeared:

```json
{
  "id": "php:Shopware\\Core\\Framework\\Adapter\\Cache\\CacheTagCollector::addTag",
  "present": [["6.7.2.0", null]],
  "flags": { "internal": [], "deprecated": [] }
}
```

That answers both questions directly ("missing before 6.7.2.0") and stays
small: most items exist unchanged across many releases. A separate
`index.json` records, per release, the tag, its commit SHA, the generator
version and when it was built.

### Range and size

From 6.5.0.0 to the newest release, about 60 tags, plus trunk. Older
releases can be added later; the census covers them if anyone needs to look
back further. The size is measured in phase 0; the target is a few MB
compressed for all of it.

### Where it lives

A GitHub release of this repository, `api-index`, with `api-index.json.gz`
and `index.json` as assets, rebuilt by a weekly workflow next to
`mine-trunk.yml`. A release asset keeps 2 GB of history out of the git
repository and is a single public download for anyone.

### Freshness

- **Tags never change.** A built release is built once; the workflow only
  adds new tags.
- **The workflow finds new tags** by comparing `index.json` with the tag
  list of `shopware/shopware`, and builds what is missing.
- **The tools check too.** If the extension's range includes a release the
  index does not have, the tool says so and answers only for the releases it
  has. With `--source <path to a shopware clone>`, it builds the missing
  tags locally instead.
- **Trunk** is a snapshot with its SHA and date. `api-diff` never uses it
  for a PR: it builds the PR's base and head from the working tree.

### The census as a cross-check

During phase 1, the PHP classes and methods of the index are compared with
the census's `classes.json.gz` and `units.json.gz` for the same tags.
Differences are bugs in one of the two. After that, the census is not
needed.

## The tools

Both read the index, have zero runtime dependencies (`node:zlib` for gzip)
and live in `tools/bin/`. The generator needs `php-parser` and
`@babel/parser`, like the AST graders, so it is its own package (see the
decisions).

### `api-facts`: does the extension fit its range?

```bash
git diff main | node tools/bin/api-facts.ts                # range from composer.json
node tools/bin/api-facts.ts --range '~6.6.0 || ~6.7.0' src/  # a whole extension
```

1. **Shopware API used**, read deterministically: `use Shopware\…`
   imports, `extends`, `implements`, `new`, static calls, method calls on a
   receiver whose type is known in the same file; admin `Component.extend`
   and `override` targets and `{% block %}` names in override templates;
   storefront `{% sw_extends %}` templates and their blocks; routes called
   by path. What cannot be resolved is listed as unknown, never guessed.
2. **Checked per release** in the range.
3. **Output** for the agent, short:

   ```text
   Shopware API in this diff, checked against 6.6.0.0 … 6.7.4.0 (api-index 2026-10-26):
   - CacheTagCollector::addTag(): missing before 6.7.2.0
   - sw-product-detail-base: block sw_product_detail_base_basic_info_card removed in 6.7.0.0
   - ProductPageLoader: @internal since 6.6.0.0
   - 2 calls not resolved (receiver type unknown)
   ```

### `api-diff`: does this PR break public API?

```bash
node tools/bin/api-diff.ts --source ~/shopware --base origin/trunk --head HEAD
```

Builds the index for the base and the head of a `shopware/shopware`
checkout, and reports, per surface, what was removed or changed without a
deprecation in the base (`CORE-063`), and what was newly deprecated. Items
flagged `internal` or `experimental` in the base are skipped, with a count.

### In the skills

One line each, never a rule of their own:

- `shopware-extension-review` and `shopware-plugin-development`: run
  `api-facts` when it is available; its output is facts to verify, not
  findings.
- `shopware-change-impact` and `shopware-core-development`: run
  `api-diff` for a core PR; it covers what `bc-check` does not.

Both tools are optional. Installing the skills does not need them, and CI
for this repository runs them only on recorded fixtures.

## Phases

**Phase 0: PHP surface, one tag (about two days).** The generator for
PHP: classes, methods, constants, flags. Run it on one tag; record time and
size. Settle the BC promise per surface from the documentation. Unit tests
on a small fixture tree.

**Phase 1: measure the PHP surface (one to two days).** Build every tag
from 6.5.0.0. Cross-check against the census. Hand-check the flags on the
known cases: `review-cache-tags-event-*` (PLG-007),
`review-optional-package-guard-*` (PLG-032), a new catch and ignore pair
each for REV-015 and PLG-001, and 10 to 20 real plugins with a range of
more than one minor, among them SwagAgenticCommerce. The phase passes at
90 % of flags right or better, with every known problem found; otherwise
WP11 stops, with the result recorded.

**Phase 2: `api-facts` for PHP, and the A/B (two to three days).** The
tool, the release asset, the weekly workflow, and an A/B with three arms on
the version-fact catch tasks: skills off, skills on, skills on plus the
tool's output. It ships if the third arm beats the second on a task where
the second fails, with no new false positives on the `-ignore` tasks.

**Phase 3: HTTP, entities and configuration (two to three days).** Routes,
OpenAPI paths, entity fields and flags, feature flags and config keys.
`api-diff` for these surfaces, checked against known breaks from the
changelog and UPGRADE files, the same 90 % gate.

**Phase 4: admin and storefront (two to three days).** Components, blocks,
position identifiers, the `Shopware.*` global, storefront blocks and JS
plugins. Both tools learn them; ADM-009, SF-009 and the block-rename cases
get the same A/B as phase 2.

Each phase can stop the plan. Phases 3 and 4 do not start until phase 2
has shipped and shown a win.

## Cost and time

| Phase | Effort | Needs |
| ----- | ------ | ----- |
| 0 | about two days | a clone of `shopware/shopware` |
| 1 | one to two days, mostly hand-checking | the census clone for the cross-check |
| 2 | two to three days | your agent login for the A/B |
| 3 | two to three days | none beyond phase 2 |
| 4 | two to three days | none beyond phase 2 |

No Kev server, no API keys. The weekly workflow needs a `shopware/shopware`
checkout with tags, about 1 GB, and builds only new tags.

## Risks

| Risk | Answer |
| ---- | ------ |
| Symbol extraction misses calls | phase 1 uses hand-picked symbols first; unresolved calls are reported as unknown |
| A class moved, so "missing" is a rename | phase 1 counts these; if common, match the short name across namespaces and report "moved" |
| Entity fields are built in code, not declared | best effort from `defineFields()`; what the parser cannot read is left out and counted, not guessed |
| Admin and storefront promises are unclear | phase 0 writes down the promise per surface from the docs; items outside it are indexed but never reported as breaks |
| `api-diff` repeats `bc-check` | PHP signature breaks in core PRs are labelled "also checked by bc-check" or left out |
| The agent treats facts as findings | the output says what was checked and how, and the skills say to verify |
| The index goes stale | weekly build, plus the tools' own check against the tag list |

## Kev, later, maybe

"Does this PR need an upgrade note?" has recorded ground truth: merged
`shopware/shopware` PRs either add to `UPGRADE-*.md` or `RELEASE_INFO-*.md`
or they do not. With `api-diff`'s output as input, that is a question a
rule may already answer. Only if it does not, a classifier is worth
measuring, the way #120 measured. Not part of this plan.

## Decisions needed

1. Where the generator lives: its own package at `tools/api-index/` with
   `php-parser` and `@babel/parser` (recommended), or inside
   `evals/tools/ast/`, which already has both but is evals-only.
2. Where the index lives: a release asset of this repository (recommended),
   or a separate public repository.
3. The first release in the index: 6.5.0.0 (recommended) or older.
4. `api-diff` for core PRs: build it in phase 3 as planned, or keep WP11
   to extensions (`api-facts`) only.
