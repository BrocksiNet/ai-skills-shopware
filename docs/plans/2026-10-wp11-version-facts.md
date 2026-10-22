# WP11, rethought: version facts instead of a classifier

Status: **draft, waiting for review.** Replaces the Kev experiment in
[WP11 of the skills evolution plan](2026-10-skills-evolution.md#wp11-kev-classifier-for-on-demand-routes-experiment).
Nothing here is built yet. The decisions at the end need an answer before
phase 1 starts.

## Summary

Recommendation: **do not run the Kev experiment as WP11 describes it.** The
same model, the same API and the same machine were already measured for
issue triage in
[shopware/framework-team#120](https://github.com/shopware/framework-team/pull/120),
and those numbers answer most of what WP11 would measure. Our routing
question is narrower, and has no recorded ground truth.

Instead, WP11 builds what both earlier results point at: **facts.**
WP6 showed that the review skill wins where the answer is a version or API
fact the model does not know (ADM-044, PLG-007, SF-009, ADM-009). #120
showed again and again that a deterministic signal or a two-line rule beat
the model, and that finding the facts was the bottleneck, not judging
them. The
[codebase census](https://github.com/shopwareLabs/codebase-census) already
measures every `shopware/shopware` release tag, class by class and method
by method. WP11 turns that into a tool that tells an agent which Shopware
API a diff uses that is missing, moved or changed somewhere in the
extension's supported version range.

## What framework-team#120 measured

On the M4 Pro this plan would run on, against 600 human-labelled issues:

| Finding | Number | What it means for WP11 |
| ------- | ------ | ---------------------- |
| Kev-4B on a 17-way choice | 61.0 %; 131 of 600 answered `unclear`, only 28 above 0.5 | the model this plan's first draft picked is not usable for choices |
| Kev-9B on the same question | 75.7 % (Jev 76.2 %) | Kev-9B is as good as the hosted model on routing |
| Kev-9B probabilities | half below 0.5; thresholds had to be re-tuned per model | a threshold from someone else's data does not transfer |
| Kev-9B speed | about 6 s per question set; 80 s per card in a full run | not something to run on every `route.ts` call |
| Embedding classifier, no LLM | 70.8 % at 43 ms on any CPU | with about 2,000 own labels, a plain classifier gets close |
| `Size` and `effort` | lost to a two-line rule and to the majority baseline; deleted | judgement questions often lose to a rule |
| Fan-in as a predictor of effort | Spearman −0.02 | "many callers, so a big change" is not true by default |
| Duplicates and fixing PRs | the model was right on 86 to 91 % of what search found; search found 41 to 81 % | the facts were the bottleneck, not the model |
| Six questions | never changed a proposal; deleted | a question that cannot change an action is noise |

The log ends with a table of twelve decisions that "reasoning said" and
measurement reversed. This plan takes that as the method: no question,
fact or threshold ships on reasoning alone.

## Why the Kev experiment is not worth running

- **One question.** Of the three `on_demand` routes, only `change-scope.md`
  can be read from a diff. Winning it adds one reference to one review.
- **No ground truth.** Triage scored against board fields humans had
  already set. "This fix grew beyond the bug" is recorded nowhere; we
  would label 40 cases ourselves and get a ±15 point interval.
- **Wrong cost profile.** Kev-9B, the size that works, takes seconds per
  call. Routing is a deterministic, millisecond step today.
- **The impact questions would repeat #120's losses.** A blast-radius
  rating built on caller counts assumes what #120 measured as false for
  effort.

Kev stays possible later, for a question that has recorded ground truth
and can change what the agent does. The last section names the one
candidate.

## What WP11 builds instead

### The question the tool answers

> This diff uses these Shopware classes and methods. The extension says it
> supports `shopware/core` `~6.6.0 || ~6.7.0`. In which of those releases
> is each one missing, and where did it appear or disappear?

That is a fact, it has an exact answer per tag, and it is the kind of
problem the WP6 A/B showed the skill helps with:

| Rule | What a version fact would have told the reviewer |
| ---- | ------------------------------------------------ |
| `PLG-032` | a suggested package's class is used outside its guard |
| `REV-015` | the guard checks for API that exists in every supported release, so it is dead code |
| `PLG-001` | the change uses API that only exists in the newest supported minor |
| `PLG-007` | `CacheTagCollector::addTag()` does not exist in 6.7.0 or 6.7.1 |
| `ADM-009`, `SF-009` | the same question for admin and storefront files, a later step |

### The data: codebase census

`shopwareLabs/codebase-census-data` holds a measurement of 202 refs: trunk
and every release tag from 6.1.0. For each ref, under `refs/<ref>/raw/`:

| File | Holds | Size (trunk, gzip) |
| ---- | ----- | ------------------ |
| `classes.json.gz` | every class, interface, trait and enum in `src/`, with path and kind | 154 KB |
| `units.json.gz` | every method as `<Class>::<method>`, with file and line | 1.7 MB |
| `edges.json.gz` | which class references which | 437 KB |
| `routes.json.gz` | routes and what they reach | 137 KB |

Limits that matter here:

- **Private repository.** The skills are public. The census can only be a
  local source for people who can clone it, never a requirement.
- **No `@internal` or `@deprecated` flags.** The census records which
  classes and methods exist, not their status. The status needs either a
  new census pattern (a `toolVersion` bump in that repo) or a read of the
  file at that tag.
- **PHP in `src/` only, for this purpose.** Admin and storefront JS are
  measured as modules, not as an API surface.

### The tool: `tools/bin/api-facts.ts`

```bash
git diff main | node tools/bin/api-facts.ts --range '~6.6.0 || ~6.7.0'
git diff main | node tools/bin/api-facts.ts            # range from the diff's or the repo's composer.json
```

1. **Symbols from the diff**, deterministically: `use Shopware\…` imports,
   `extends`, `implements`, `new`, static calls, and method calls on a
   receiver whose type is a Shopware class in the same file. Unresolvable
   calls are listed as unknown, not guessed.
2. **Tags in the range:** the release tags that satisfy the constraint, read
   from the census index or from GitHub's tag list.
3. **Lookups** through a backend:
   - `census`: a local clone of `codebase-census-data`
     (`SHOPWARE_CENSUS_DATA=~/…`). Fast, every tag.
   - `github`: the file at each tag from the public `shopware/shopware`
     repository, checked for the class and `function <method>(`. Slow, but
     available to anyone.
   - none: the tool says so and prints nothing else. CI tests run on
     recorded fixtures.
4. **Output** for the agent, short:

   ```text
   Shopware API in this diff, checked against 6.6.0.0 … 6.7.4.0 (census):
   - CacheTagCollector::addTag(): missing before 6.7.2.0
   - AbstractProductDetailRoute: in every release
   - 2 calls not resolved (receiver type unknown)
   ```

The review skill and `shopware-plugin-development` get one line each: run
it when it is available, and treat its output as facts to check, not as
findings.

### Phases

**Phase 0: the data path (about a day).** A reader for the census raw
files with type guards (`tools/src/census.ts`), the tag list for a
constraint, and the lookups for one class and one method. Unit tests on a
trimmed fixture of two refs.

**Phase 1: measure before building more.** Run the lookups, with symbols
picked by hand, over the cases where we already know the answer:

- the PHP version-fact review tasks that exist: `review-cache-tags-event-*`
  (PLG-007) and `review-optional-package-guard-*` (PLG-032). REV-015 and
  PLG-001 have no task yet; phase 1 adds a catch and ignore pair for each;
- 10 to 20 real plugin repositories or PRs with a declared multi-minor
  range, among them SwagAgenticCommerce.

Per flag, hand-check whether it is right, as #120 did for fixing PRs. The
phase passes when at least 90 % of flags are right and it finds the known
problems in the eval tasks. If it does not, WP11 stops here, with the
result recorded.

**Phase 2: the tool.** Symbol extraction from the diff, both backends, the
output above, `tools` tests with recorded data, and the one-line hooks in
the two skills.

**Phase 3: does it change model behaviour?** The A/B harness, with three
arms on the version-fact catch tasks: skills off, skills on, skills on
plus the tool's output in the prompt. It ships only if the third arm beats
the second on at least one task where the second fails, without new false
positives on the `-ignore` tasks.

**Phase 4 (optional): status, not just existence.** `@internal` and
`@deprecated` per tag, either as a census pattern or from the file at the
tag. Same gate as phase 1.

### What stays as it is

- CI never needs the census, the network or Kev. The routing cases and all
  evals run as today.
- Installing the skills does not need the tool.
- `tools/` keeps zero runtime dependencies (gzip is `node:zlib`).

## The one Kev question worth keeping in mind

"Does this PR need an upgrade note?" has recorded ground truth: merged
`shopware/shopware` PRs either add to an `UPGRADE-*.md` or
`RELEASE_INFO-*.md` file, or they do not. That is the shape #120 needed to
measure honestly: hundreds of labelled cases without hand-labelling. If
`shopware-pr-description` or `shopware-change-impact` ever needs that
answer, it is a separate experiment, Kev-9B or an embedding classifier
against "never" and "always", measured the way #120 measured. It is not
part of this plan.

## Cost and time

| Phase | Effort | Needs |
| ----- | ------ | ----- |
| 0 | about a day | a clone of `codebase-census-data` (483 MB) |
| 1 | one to two days, mostly hand-checking | the same, plus plugin repositories |
| 2 | two to three days | none beyond phase 0 |
| 3 | an evening of local A/B runs | your agent login |
| 4 | one to two days, optional | possibly a census change |

No Kev server, no Modal, no API keys.

## Risks

| Risk | Answer |
| ---- | ------ |
| Symbol extraction from a diff misses calls | phase 1 uses hand-picked symbols first; unresolved calls are reported as unknown |
| The census is private | `github` backend for everyone else; the tool is optional either way |
| A class moved, so "missing" is a rename | phase 1 counts these; if common, look up the short name across namespaces and report "moved" |
| Existence is not the problem; status is | phase 4, gated the same way |
| The agent treats the facts as findings | the output says what it checked and how, and the skills say to verify |

## Decisions needed

1. Drop the Kev experiment from WP11, as recommended, or still run it on
   `change_scope` for completeness.
2. Re-scope WP11 to version facts from the census, as above.
3. Census access: can the tool read a local clone of
   `codebase-census-data`, and is a public `github` fallback wanted for
   people without it?
4. Phase 4 (`@internal` and `@deprecated` status): a new census pattern in
   that repository, or a read of the file at the tag from this tool?
