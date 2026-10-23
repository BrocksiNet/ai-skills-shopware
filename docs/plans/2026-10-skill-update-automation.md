# Skill update automation plan (2026-10)

Status: **done** (2026-10-23), all phases; how it works today is in [`docs/maintenance.md`](../maintenance.md) · Author: BrocksiNet · Created: 2026-10-23

Rules go stale because Shopware changes every week. Half of the upkeep is
automated already: the weekly trunk mining issue and the weekly API index.
A person still reads each drift issue, finds the rule it touches, and writes
the change and its eval. This plan automates the reading and the drafting.
The merge stays human, and every rule change still has to pass the A/B gate.

It extends [WP8](2026-10-skills-evolution.md#wp8-automated-trunk-mining) and
[WP9](2026-10-skills-evolution.md#wp9-upstream-watchlist) of the skills
evolution plan, and builds the "Planned: upstream skill sets" part of the
maintenance page (`docs/maintenance.md`, added in #54).

## Why now

Both rules in #55 (`REV-034`, `REV-035`) came from maintainer review comments
on merged core PRs (#19917, #20855). No guideline file and no agent skill on
trunk carried them, so trunk mining could not have found them. Review
comments are the earliest place a recurring pattern shows up. Today nobody
collects them.

## How the pieces fit

```mermaid
flowchart LR
  subgraph collect["Collect (CI, no model)"]
    GIT["Git sources<br/>trunk, upstream skill repos"]
    REV["Merged-PR reviews<br/>shopware/shopware<br/>(SwagCommercial locally)"]
    IDX["API index<br/>(exists)"]
  end
  subgraph map["Map (CI, no model)"]
    MAP["Signal to rule mapper<br/>catalog + routes.json"]
  end
  GIT -- weekly --> MAP
  REV -- daily --> MAP
  IDX -- weekly --> MAP
  MAP --> ISSUE["drift issue<br/>grouped by skill and rule"]
  MAP --> STORE["review-signals<br/>release asset (JSONL)"]
  subgraph local["Suggest (local, your agent login)"]
    SUG["suggest-rules<br/>new / update / retire"]
    DRAFT["draft: rule + catalog<br/>+ eval task"]
  end
  STORE --> SUG
  ISSUE --> SUG
  SUG --> DRAFT
  DRAFT --> GATE["validate + graders<br/>+ A/B gate"]
  GATE --> PR["Draft PR"]
  PR --> HUMAN["Human review and merge"]
```

Four layers, each usable without the next one:

| Layer | Runs | Model cost | Output |
| ----- | ---- | ---------- | ------ |
| Collect | CI, weekly and daily | none | Normalized **signals**: one changed line, rule class or review comment each |
| Map | CI, inside the collectors | none | Each signal tagged with the skills, references and rule IDs it touches |
| Suggest | Local command | your agent plan | Proposals: new rule, rule update, or retirement, each with evidence links |
| Draft | Local command, later CI on a label | your agent plan | A draft PR with rule text, catalog entry and eval task, gated by the A/B |

The cheap, deterministic layers come first. They pay off on their own: the
drift issue gets shorter and names the rule to look at. The model layers only
read data the deterministic layers already filtered and mapped.

## The signal format

Every collector writes the same JSON Lines record, so the mapper, the issue
renderer and the suggest command share one parser in `tools/src/signals.ts`.

```json
{
  "id": "shopware/shopware#19917/review-comment/4102108586",
  "source": "core-reviews",
  "kind": "review-comment",
  "repo": "shopware/shopware",
  "url": "https://github.com/shopware/shopware/pull/19917#discussion_r4102108586",
  "date": "2026-09-25T07:12:51Z",
  "pr": { "number": 19917, "title": "…", "merged_at": "2026-10-20T14:30:08Z" },
  "author": { "login": "dgrothaus-sw", "association": "MEMBER" },
  "path": "src/Storefront/Framework/SystemCheck/ProductDetailReadinessCheck.php",
  "text": "(blocking) The category lookup does not see Dynamic Access restrictions …",
  "lines": ["        $criteria = new Criteria();", "…"],
  "thread": { "replies": 1, "outdated": false },
  "map": [
    {
      "skill": "sw-review-learnings",
      "reference": "references/dal-and-performance.md",
      "rules": ["REV-021", "REV-022", "REV-023", "REV-024", "REV-033", "REV-035"],
      "via": "routes"
    }
  ]
}
```

Kinds: `skill-bullet`, `guideline-heading`, `guide-id`, `rule-class`,
`template-line` (today's trunk deltas), `upstream-line` (an upstream skill
repo), `review-comment`, `review-body`, and `api-break` (from `check-breaks`).
The `id` is stable, so a re-run never duplicates a signal. `lines` are the
added and removed lines the route anchors run on: the diff hunk for a
review comment, the changed line itself for a drift change.

## Phase 0 results (2026-10-23)

Measured over PRs merged into `shopware/shopware` trunk from 2026-09-01 to
2026-10-22, with a one-off script outside the repo:

| Measure | Count |
| ------- | ----- |
| Merged PRs | 709 |
| Review threads | 1207 |
| Threads started by a maintainer, not the PR author, not a bot | 994 |
| Of those, at least 40 characters without suggestion blocks | 799 |
| Of those, outdated (the code changed after the comment) | 513 |
| Merged PRs with at least one kept thread | 245 |
| Maintainer review bodies of at least 40 characters | 139 |

What this changes:

- **Volume is small.** About 15 kept threads a day, from 51
  reviewers. Storage and API limits are not a concern.
- **Resolved means nothing.** Almost every thread on a merged PR is
  resolved, so the collector does not store it.
- **Outdated is a weight, not a filter.** Keeping only outdated threads
  would leave 43%, but it drops the `REV-035` source: the blocking Dynamic
  Access finding on #19917 was answered in another file and never went
  outdated. The suggest step weights outdated threads higher instead.
- **Both #55 sources are in the data.** #20855 (merged 2026-10-13) and
  #19917 (merged 2026-10-20) carry the comments behind `REV-034` and
  `REV-035`, so the step 3 backfill acceptance holds.
- **About a fifth of kept threads end in a question.** They stay. A
  question that leads to a code change is often the finding.

## Step 1: one mining job, many sources

Generalize `tools/bin/mine-trunk.ts` from one hard-coded repo to a source
list. The trunk extractors in `tools/src/trunk-deltas.ts` stay as they are;
upstream repos get a generic Markdown extractor (bullets and headings).

**Source list**: `rules/sources.json`, one entry per source:

```json
{
  "id": "ai-coding-tools",
  "repo": "shopwareLabs/ai-coding-tools",
  "branch": "main",
  "paths": ["plugins/test-writing", "plugins/contributor-writing"],
  "extractor": "markdown",
  "skills": ["sw-testing", "sw-pr-description"]
}
```

First sources: `shopware/shopware` (today's `WATCHED` paths),
`shopwareLabs/ai-coding-tools`, `netresearch/php-modernization-skill`,
`shopware/shopware-cli` skills and `FriendsOfShopware/agent-skills`. The
PHPUnit skill joins once it exists. `skills` names the skills that learn
from the source, so a change there is mapped even without a catalog link.

**State**: `docs/.mining-state.json` becomes a map from source ID to
`{last_sha, last_date}`. The current object migrates to the `shopware`
entry. A new source starts at its head on the day it is added.

**Issue**: one weekly `trunk-drift` issue stays, with a section per source.
Rename the label to `drift` only if the trunk section gets lost among the
others. The state marker in the body records every source, so one `/mined`
comment still moves all of them, and never past unread deltas.

**Acceptance**:

- The 2026-10-13..2026-10-19 window still reports the eight commits WP8
  reported. The WP8 assertions in `tools/test/mine-trunk.test.ts` still
  hold, rewritten for the grouped layout.
- A stubbed upstream commit that adds a bullet shows up under its source.
- `rules/sources.json` has a schema and `validate-skills.sh` checks it.

## Step 2: map each change to a rule

A new mapper, `tools/src/map-signal.ts`, tags each signal with the skills,
references and rule IDs it touches. It uses only data the repo already has,
in this order, and records which one matched in `via`:

1. **`core_guide_ids`**: a guide ID in the signal matches a rule's IDs.
2. **`enforced_by.tool`**: a rule class matches a check a rule cites.
3. **`trunk.source`**: the signal's file and heading match a rule's
   `path#anchor`. Today only some rules have it; the report lists rules
   whose source changed.
4. **`upstream`**: a new optional catalog field, the upstream counterpart of
   `trunk.source`, for rules learned from an upstream skill.
5. **`routes.json`**: the signal's path and diff lines run through
   `routeDiff()` from `tools/src/routes.ts`. A review comment on a file the
   cache route selects maps to the cache reference and the rules in it.
6. **`sources.json` `skills`**: the fallback for an upstream change no rule
   cites yet.

A signal with no match is **unmapped**. Unmapped signals are the backlog for
new rules; mapped ones are candidates for an update.

**Issue layout**: the drift issue groups signals by skill, then by rule:

```markdown
## sw-testing
### TEST-014 (via enforced_by)
- `NoExpectExceptionMessageRule` modified in [1a2b3c4d](…)
### Unmapped
- New bullet in `.agents/skills/sw-testing/SKILL.md`: "…" ([5e6f7a8b](…))
```

**Acceptance**:

- Every existing report item lands under a skill or in **Unmapped**. Items
  that used to be listed flat appear under the rule `core_guide_ids` or
  `enforced_by` names.
- A routing test on the real #19917 review comments (fixture under
  `tools/test/fixtures/signals/`): the blocking Dynamic Access finding maps
  to the reference that holds `REV-035`.
- The catalog schema has `upstream`, and `validate-rules` accepts it.

### Steps 1 and 2: what was built (2026-10-23)

Both steps shipped together. Differences from the spec above:

- **No label rename.** The issue title is now "Drift: week of …"; the label
  stays `trunk-drift`, so old issues still close as superseded.
- **Sources start at today's head.** `.mining-state.json` got an entry for
  every upstream source at its branch head on 2026-10-23. A source added
  later without an entry gets a first pass that only records its head.
- **Routes run per signal, not through `routeDiff()`.** The mapper calls
  `routeMatches()` for each route of each skill and skips borrowed routes,
  so a change is filed under the owning skill once. A changed line in a
  guideline or skill file has no code path, so only anchors can match it;
  a review comment has its file path and the diff hunk.
- **Rule-level matches win.** Routes only run when no rule matched, and the
  source's skill list only when no route matched either.
- **An uncited guide ID is not unmapped.** It falls back to the skills that
  read core's review guides, under "No rule yet".
- **`REV-034` is out of reach for the mapper.** The history-comment
  findings on #19917 and #20855 sit in hunks without history words in a
  comment line, so no route anchor matches them. Recognising them as
  covered is left to step 4, whose acceptance already asks for it.
- **`PRD-001` and `PRD-008` got a `trunk.source`.** The first live run had
  114 changes from the PR template restructure (#21627) that only reached
  the skill. With the link they land under `PRD-001`, and a change to the
  checklist heading under `PRD-008`.
- **`--signals FILE`** writes the mapped changes as JSON Lines, the input
  step 4 will read.

## Step 3: collect merged-PR reviews daily

A daily workflow, `.github/workflows/collect-reviews.yml`, runs
`tools/bin/collect-reviews.ts`. It reads the PRs merged into
`shopware/shopware` trunk since the last run and turns their review comments
into signals. No model calls and no secrets beyond `GITHUB_TOKEN`.

**What it reads**: one GraphQL search for PRs merged into trunk since the
cursor (`is:pr is:merged base:trunk merged:>…`), 25 PRs per page. Each page
brings the review threads with their first comment, `path`, `isOutdated`
and the comment count, and the review bodies. Phase 0 needed about 30
queries for 52 days, so a daily run is one or two queries.

**What it keeps**:

- Authors with `author_association` `MEMBER` or `OWNER`, minus bots and the
  PR's own author. A maintainer team list can replace this later.
- Thread starters only. Replies are counted in `thread.replies`, not stored.
- `thread.outdated`: the diff under the comment changed later, so the author
  most likely acted on it. It is a weight for the suggest step, not a filter:
  the blocking finding behind `REV-035` was never outdated.
- Review bodies of at least 40 characters, as kind `review-body`.
- It drops thread starters under 40 characters once `suggestion` blocks and
  HTML comments are removed. Most of them are typo fixes or "nit".

**Where the data lives**: a release named `review-signals`, like the
`api-index` release, with one asset per month (`reviews-2026-10.jsonl`).
The daily job downloads the current month, appends new signals by `id`, and
uploads it again. The newest `merged_at` in the asset is the cursor, so
there is no state file in the repo and no daily commit. Assets older than
twelve months are deleted.

**Why not commit the data**: a daily commit to `main` would bury real
changes, and the comments are public on GitHub anyway. The release keeps
them machine-readable and one download away for the local command.

**Content rules**: a signal stores the comment text for analysis only.
Skills never quote it. A rule drafted from it is written in our own words,
like everything else in the library, and links the PR as its source.

**Acceptance**:

- A backfill run over 2026-09-01..2026-10-20 contains the #19917 and #20855
  comments behind `REV-034` and `REV-035`, mapped to those rules.
- A daily run makes at most a few GraphQL queries and keeps what the
  phase 0 filter keeps: about 15 signals a day.
- The GitHub API is stubbed in `tools/test/collect-reviews.test.ts`.

### Step 3: what was built (2026-10-23)

Built with the decisions below. Differences from the spec above:

- **Every reviewer counts, trust is earned.** The collector keeps comments
  from anyone but bots and the PR's author. `reviewers.json` gives each
  reviewer a trust score: the share of their threads that went outdated,
  pulled toward 0.5 for org members and 0.25 for others with a weight of
  four comments. In the backfill, 904 of 913 kept core signals came from
  members, so the wider gate costs nothing; the score is what tells
  reviewers apart. Step 4 weights by it.
- **Two review sources.** `rules/sources.json` has a `reviews` list:
  `core-reviews` (`shopware/shopware`) and `commercial-reviews`
  (`shopware/SwagCommercial`, private). This repository and its releases
  are public, so a private source is collected only locally into the
  git-ignored `.cache/review-signals/`. The collector refuses it in
  Actions, and the drift issue leaves it out.
- **One file per source and month**, `core-reviews-2026-10.jsonl`, not
  `reviews-2026-10.jsonl`. The daily job downloads every asset before it
  merges, so a backfill cannot overwrite a month, and stops when a
  download fails. A core month is about 1 MB.
- **Searches go a week at a time**, so a backfill never hits the 1000-result
  cap of the search API. A week of core PRs takes about six queries.
- **The review state is stored** (`review.state`, e.g. `CHANGES_REQUESTED`)
  for step 4's "unless the review requested changes".
- **`lines` are the added and removed lines** at the end of the hunk, at
  most 30, without their `+`/`-` prefix.
- **The drift issue has a "Review comments" section**: the week's signals
  counted per skill and reference, with outdated counts and PR links,
  mapped again with today's rules.

Acceptance, on a live backfill over 2026-09-01..2026-10-20:

| Measure | `core-reviews` | `commercial-reviews` |
| ------- | -------------- | -------------------- |
| Merged PRs | 684 | 192 |
| GraphQL queries | 30 | 11 |
| Signals kept | 913 | 197 |
| Mapped to a skill | 496 | 92 |

- The blocking Dynamic Access comment on #19917 maps to the reference that
  holds `REV-035`. The history comments behind `REV-034` on #19917 and
  #20855 are in the data; as in step 2, no route reaches them.
- The GitHub API is stubbed in `tools/test/collect-reviews.test.ts` with
  the two PRs as recorded on 2026-10-23.

## Phase 3b: replay tests (done 2026-10-23)

Step 4 reads what mining and the review collector map. Before a model
proposes rules from that data, both are replayed against recorded history,
so a mapping fault shows up as a failing test and not as a wrong proposal.
Built in #67 (mining) and #66 (router).

**Mining.** Ten recorded weeks across every source, each checked against a
hand reading of the commits. The replay found eight faults, all fixed:
commits merged after the state but dated before it were skipped, merge
commits were read twice, unwatched Markdown and change logs were read, code
blocks and frontmatter came out as rules, review persona bullets were
missed, helper classes counted as rule classes, commits were cut at 300
files, and the workflow closed drift issues the new report did not cover.

| Window | Commits with a change found |
| ------ | --------------------------- |
| shopware 2026-10-13..19 (the WP8 golden window) | 8/8 |
| shopware 2026-10-05..11 | 5/5 (was 4/5) |
| shopware 2026-09-28..10-04 | 8/8 |
| php-modernization 2026-09-28..10-04 | 4/4 |
| php-modernization from a state commit | 2/2 (0/2 by date) |
| ai-coding-tools 2026-09-01..07 | 4/4 |
| shopware-cli 2026-10-13..19 | 1/1 |

Noise on the upstream sources fell sharply: on ai-coding-tools from 193
lines and nine unmapped items to 123 lines and none. `--dry-run` and a
per-source `/mined <source>` came with it.

**Router.** `tools/bin/replay-routes.ts` replays merged core PRs from the
`core-reviews` backfill (2026-09-01..2026-10-20, 235 PRs with review
comments) and compares the references the router selects with the ones the
comments map to. The comments are mapped through the same routes, on their
own hunk, so recall is a consistency check; the hand labels in the corpus
are the independent part.

| Measure | Value |
| ------- | ----- |
| Recall over comment-mapped references | 88.5 % (407/460) |
| References selected per PR | 5.59 |
| Of those, with no matching comment | 3.86 |

Every miss came from code no longer in the merged diff: the file was gone
(33) or the hunk changed, mostly outdated threads (30). The noisiest
references are `core-platform-patterns.md`, `test-shape-and-flags.md` and
`release-notes-and-adr.md`. `REV-034` now has a route that reaches the
history comment on #19917. A corpus of 34 PRs in `evals/routing-replay/` keeps
a recall floor of 0.76 and at most five references per PR in CI.

The three new trunk checks the replay listed as unmapped now have catalog
entries: `StoreApiRouteExtensionRule` under `ARCH-004`,
`NoFeatureSkipInUnitTestsRule` under `TEST-006` and
`NoReflectionInUnitTestsRule` under `TEST-012`. Left open: the noisy "used
to" and "no longer" anchors on `code-comments.md`, and replaying each
comment at its own commit instead of the merged diff.

## Step 4: suggest rules with a local command

`node tools/bin/suggest-rules.ts` reads signals and proposes changes. It runs
on your machine with the agent you are logged in to, through the adapters in
`tools/src/agents.ts`, the same way `eval-local.ts` does. It costs your
plan's usage, not an API key.

```bash
node tools/bin/suggest-rules.ts --since 2026-09-01            # all sources
node tools/bin/suggest-rules.ts --since 30d --skill sw-testing
node tools/bin/suggest-rules.ts --signals ./reviews-2026-10.jsonl --agent opencode
```

**Pipeline**:

1. **Load** the `review-signals` assets for the window and the open drift
   issue. Both are already mapped.
2. **Cluster without a model**: group by mapped reference, then by file area
   (the first two path segments under `src/`). Drop clusters of one signal
   unless the review requested changes.
3. **Ask the agent per cluster**, with the signals as quoted data, the
   mapped rules' current text, and the five inclusion criteria from the
   README. The answer must match a JSON schema:

   ```json
   {
     "action": "new | update | retire | none",
     "skill": "sw-review-learnings",
     "rule": "REV-034",
     "title": "Comments describe the code, not its history",
     "evidence": ["https://github.com/shopware/shopware/pull/19917#discussion_r…"],
     "criteria": { "delta": "…", "frequency": "…", "single_home": "…", "testable": "…" },
     "draft": "One paragraph of rule text in our words",
     "eval": { "kind": "review-pair | task", "catch": "…", "ignore": "…" }
   }
   ```

4. **Check without a model**: `rule` exists for `update` and `retire`, the
   skill owns the topic in `REGISTRY.md`, every evidence URL is in the input
   signals, and a `new` rule has at least two PRs as evidence or one review
   that requested changes.
5. **Write** `suggestions/<date>.md` (git-ignored) and the JSON next to it.
   Nothing is committed.

**Retirement candidates** come from deterministic evidence first, and the
agent only explains them:

- a new `enforced_by` check now catches the rule in plugins too
  (`trunk_only: false`), so it moves to the "Already enforced" section
- the API index says the symbol the rule is about is gone in every
  supported version
- the latest A/B shows the skill-off arm already passes the rule's task in
  every repeat, so the delta principle no longer holds

**Acceptance**:

- Run on the backfill from step 3, it proposes `REV-034` and `REV-035` as
  covered (`none` or `update`), not as new rules.
- An evidence URL that is not in the input fails the check, tested with the
  fake agent from `tools/bin/fake-agent.ts`.
- A run over 30 days with a typical volume stays under a set number of agent
  calls (`SUGGEST_MAX_CLUSTERS`, default 20).

### Step 4: what was built (2026-10-23)

`tools/bin/suggest-rules.ts` with the logic in `tools/src/suggest-*.ts` and
the ask adapters in `tools/src/agent-ask.ts`; the user guide is
[`docs/maintenance.md`](../maintenance.md#suggesting-rule-changes).
Differences from the plan above:

- Clusters are keyed by the rule a signal maps to (a rule-level match),
  else its reference, else the file area for unmapped signals. Ranking is
  the sum of the weights: reviewer trust, times 1.5 for an outdated thread
  and again for a review that requested changes.
- Routes map a comment only through the lines of its own hunk, so many
  comments on a topic stay unmapped. Each prompt therefore also lists up to
  eight rules the signals share words with (BM25 over every active rule).
  Without it, the first acceptance run proposed `REV-034` again as a new
  rule from the `area:Core/Framework` cluster.
- An answer may hold up to three proposals per cluster.
- Retirement candidates are asked first and count against the cap.
- Extra options: `--source`, `--offline`, `--out`, `--api-index` and
  `--baseline`. "Skill owns the topic" means the skill owns at least one
  topic in the coverage matrix; a `none` may cite a rule of another skill.
- Nothing is collected from private sources here; the `private` flag on a
  proposal comes from the review source and blocks a PR in step 5.

**Acceptance run** (claude, haiku; `core-reviews` 2026-09-01 to 2026-10-22,
default cap): 949 signals, 510 mapped, 53 clusters (13 single-signal
clusters dropped), 20 agent calls with 35 clusters over the cap, no agent
errors, about 349k input and 95k output tokens. 52 proposals: 19 `new`, 14
`update`, 17 `none`, 2 `retire` (`TEST-013` and `PLG-002`, both from an
`enforced_by` check that is not trunk-only; no API index or A/B candidate).
48 passed the checks; the 4 that failed were `none` answers citing a rule of
another skill, which the check accepts since. `REV-034` came out as
`update` once and `none` three times, `REV-035` as `none` twice; neither as
`new`. The fake-agent tests cover the schema, an evidence URL outside the
input, the cap, the clustering and the retirement evidence.

## Step 5: draft the pull request

`node tools/bin/suggest-rules.ts draft <suggestion-id>` turns one accepted
proposal into a draft PR:

1. Create a worktree and a branch `rules/<skill>-<slug>`.
2. Ask the agent to make the change by the steps in `AGENTS.md`: the rule in
   its owning file with the next free ID, the catalog entry, activation
   prompts, and the eval task with golden `fixtures/pass/` and an
   almost-pass `fixtures/fail/`. For a retirement: the catalog status, the
   removed text, and the eval task kept or retired.
3. Run the free checks: `validate-skills.sh`, the tools tests, the golden
   graders and Markdown lint. On a failure, give the agent the output once
   more, then stop and report.
4. Run the A/B with `eval-local.ts` for the new or changed tasks.
5. Open a draft PR with the evidence links, the criteria answers and the A/B
   table. Add the `run-evals` label so CI repeats the A/B.

You review and merge. Nothing merges on its own, and a draft whose A/B the
skill does not win stays a draft.

**Later**: the same command in a workflow, started by a `/draft <id>`
comment on the drift issue. It waits until the local command has drafted
enough good PRs to trust it.

**Acceptance**:

- A drafted PR passes every free check without manual edits for at least
  three of five proposals from the backfill.
- The A/B table in the PR body matches the `eval-local` results file.

### Step 5: what was built (2026-10-23)

`node tools/bin/suggest-rules.ts draft <id>` with the logic in
`tools/src/draft-*.ts`; the user guide is
[`docs/maintenance.md`](../maintenance.md#drafting-a-proposal).
Differences from the plan above:

- The worktree goes to `.cache/drafts/<branch>` and starts from
  `origin/<base>`. The installed `node_modules` are linked in, not
  installed again, and kept out of the commit.
- Before the checks, the command runs the generators that `AGENTS.md`
  names (`render-routes`, `render-enforced`, `render-router-index`) and
  `npm run format`. In the first acceptance pass a new reference with a
  stale router index failed `validate-skills` twice.
- The free checks include the tools type check and lint, because CI fails
  on them too.
- Claude runs with `--tools Read,Edit,Write,Glob,Grep,Bash`, `Bash` allowed
  only for `node`, `npm test`/`npm run`, `bash scripts/` and `bash evals/`,
  `--permission-mode dontAsk`, `--strict-mcp-config` and no tokens.
  `--restricted` would confine the file tools too, but under `dontAsk` it
  denies every `Bash` call.
- The A/B takes the tasks the change adds or edits, plus the eval of an
  updated rule. The PR body reads the table back from the results file.
- A proposal that failed its checks, a `none`, or (for a PR) one with
  private evidence is refused.

**Acceptance run** (claude, haiku, `--no-pr`, `DRAFT_REPEATS=1`): five
proposals from the step 4 run.

| Proposal | Change | Attempts | Free checks | A/B (on / off) |
| -------- | ------ | -------- | ----------- | -------------- |
| update `REV-034` | text, title, catch grader and fixture | 1 | all pass | catch 1/1 vs 1/1, held |
| new `REV-036`, anchored admin pattern | rule, new reference and route, review pair | 1 | all pass | catch and ignore 1/1 vs 1/1, held |
| new `REV-036`, subset lookup as a filter | rule, review pair | 1 | all pass | catch 0/1 vs 0/1; ignore 1/1 vs 0/1; gate FAIL |
| retire `TEST-013` | catalog status, bullet removed | 1 | all pass | no task changed |
| update `TEST-035` | text in `SKILL.md` and the reference | 1 | all pass | catch 1/1 vs 1/1, held |

All five pass every free check without manual edits (target: three). Every
A/B table in the five PR bodies matches its results file row for row. The
subset-lookup draft is one that stays a draft: its catch task fails with
the skill on. No PR was opened; the worktrees and `rules/*` branches were
removed afterwards.

## Safety and cost

- **Untrusted input.** Review comments and upstream files are text from
  other people. The agent sees them as quoted data in the prompt, never as
  instructions. The draft step runs in a worktree with edit and test tools
  only, without network access or tokens.
- **No silent changes.** CI never edits skills. Only the local command
  writes rule text, and only into a draft PR.
- **Cost.** Steps 1 to 3 need no model. Steps 4 and 5 use your agent plan
  and are capped per run. The daily collector makes one or two GraphQL
  queries.
- **License.** Upstream and review text informs a rule; it is never copied
  into one. CC-BY-SA sources stay rewrite-only, as `REGISTRY.md` says.

## Order and size

| Phase | Work | Depends on | Size | Model cost |
| ----- | ---- | ---------- | ---- | ---------- |
| 0 | **Done.** Measure: count maintainer review comments on trunk for September and October 2026, and how many pass the noise filter | none | S | none |
| 1 | **Done.** Source list and per-source state | none | M | none |
| 2 | **Done.** Signal format and mapper; drift issue grouped by rule | 1 | M | none |
| 3 | **Done.** Daily review collector and the `review-signals` release | 2 | M | none |
| 3b | **Done.** Replay tests for mining and the router against recorded history | 3 | M | none |
| 4 | **Done.** `suggest-rules` command | 3b | M | local |
| 5 | **Done.** `suggest-rules draft` | 4 | L | local |

Each phase includes its documentation; see [Documentation](#documentation).

Phases 1 and 2 can ship in one release. Phase 0 decides the filter
thresholds of phase 3 before any code is written.

## Documentation

A phase is done only when its docs describe what was built, not what was
planned. Each phase updates the docs in the same pull request as the code:

| Phase | Docs to update |
| ----- | -------------- |
| 1 | `docs/maintenance.md`: the "Planned: upstream skill sets" section becomes "What runs today", with the source list and how to add a source. The short README has no mining paragraph any more, so the maintenance page carries it. |
| 2 | `docs/maintenance.md`: how to read the drift issue grouped by skill and rule, and what "unmapped" means. `AGENTS.md`: fill `upstream` or `trunk.source` when adding a rule, so the mapper finds it. `rules/catalog.schema.json` describes `upstream`. |
| 3 | `docs/maintenance.md`: the review collector, what it keeps and drops, where the `review-signals` release is, and how to download a month. The flowchart gets the daily path. |
| 4 | A new section "Suggesting rule changes" in `docs/maintenance.md`: the command, its options, the proposal format, how to judge a proposal against the five criteria, and the retirement evidence. `AGENTS.md` "Repository layout" and "Adding or changing a rule" point to it. |
| 5 | `docs/maintenance.md` "How a change lands": the drafted-PR path next to the manual one, the checks it runs, and what a reviewer looks at before merging. `AGENTS.md` lists the draft command. |

After phase 5, `docs/maintenance.md` explains the whole process end to end
in one place: sources, signals, mapping, suggestions, drafts, gate and
merge. This plan then gets status **done** and links to that page instead
of repeating it.

## Decisions (2026-10-23)

1. **Storage.** A `review-signals` release, like `api-index`.
2. **Who counts as a maintainer.** Not membership alone: comment quality
   matters, and a new employee or a long-time contributor can both be
   right. Every reviewer is collected, and trust is earned over time from
   their record (`reviewers.json`).
3. **Review sources.** `shopware/shopware` and the private
   `shopware/SwagCommercial`. The private one is collected locally only.
4. **Issues.** One drift issue for all sources, reviews included.
