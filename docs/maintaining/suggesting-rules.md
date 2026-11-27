# Suggesting rules

Rule proposals from review signals and the drift issue, drafting one as a pull request, and the CI workflow that does both. Overview: [Staying current](README.md).

## Suggesting rule changes

[`tools/bin/suggest-rules.ts`](../../tools/bin/suggest-rules.ts) turns the
review signals and the open drift issue into proposals: a new rule, an
update, a retirement, or "already covered". It runs locally with the agent
you are logged in to and writes `suggestions/<date>.md` and `.json`. The
folder is git-ignored, because a proposal can quote a private review.

```bash
node tools/bin/suggest-rules.ts --since 2026-09-01 --source core-reviews
node tools/bin/suggest-rules.ts --since 30d --skill sw-testing
node tools/bin/suggest-rules.ts --signals ./reviews.jsonl --agent opencode --offline
```

| Option | Default | What it does |
| ------ | ------- | ------------ |
| `--since` | `30d` | Start of the window, `YYYY-MM-DD` or a number of days |
| `--until` | today | End of the window |
| `--skill` | every skill | Ask only the clusters of one skill |
| `--signals FILE` | | Read these signals (JSON Lines) instead of the cache and the drift issue |
| `--source ID` | every source | Review sources from `.cache/review-signals/`; repeat for more |
| `--agent` | `claude` | `claude`, `copilot`, `opencode`, or a command that reads the prompt on stdin |
| `--offline` | off | Neither download release assets nor read the drift issue |
| `--out DIR` | `suggestions/` | Where the files go |
| `--api-index FILE` | `$API_INDEX`, then the user cache | The API timeline for the retirement check |
| `--baseline FILE` | newest `evals/baselines/*.jsonl` | The A/B results for the retirement check |
| `--continue FILE` | | An earlier `suggestions/<date>.json`: ask only the clusters it did not, in its window |

`SUGGEST_MAX_CLUSTERS` (20) caps the agent calls, `SUGGEST_MAX_SIGNALS` (25)
the signals quoted per cluster, `SUGGEST_MODEL` (`haiku` for claude,
`claude-haiku-4.5` for copilot) picks the model. The run prints the token use.

**A second pass.** The clusters over the cap are not lost. Continue the
run, and it asks the next ones and writes one result with both:

```bash
SUGGEST_MAX_CLUSTERS=40 node tools/bin/suggest-rules.ts --continue suggestions/2026-10-23.json --source core-reviews
```

The window comes from the earlier run, and new IDs follow its last one.
On the same day the result replaces the earlier file, which it contains.

**What happens, in order.**

1. The `review-signals` assets of the window that are newer than the cache
   are downloaded, and the open `trunk-drift` issue is read. Every signal
   is mapped again with today's routes.
2. Signals are clustered without a model: by the rule or reference they map
   to, and unmapped ones by file area (`Core/Checkout`). A cluster with one
   signal is dropped unless its review requested changes. A signal weighs
   its reviewer's trust from `reviewers.json`, times 1.5 when its thread went
   outdated and again when the review requested changes. Clusters are asked
   in order of weight; the rest are listed under "Over the cap".
3. Retirement candidates come first, found without a model:
   - an `enforced_by` check whose `extensions_run` proves that plugins and
     apps run it with no setup of their own. Not being `trunk_only` is not
     enough: `phpstan-deprecation-rules` runs only where a plugin installs
     it, and `CompletionGuard` only under Shopware's `TestBootstrapper`;
   - every class the rule names is gone from the API index in the supported
     releases (`SUGGEST_SUPPORTED_FROM`, 6.6.0.0);
   - the rule's eval task passed every repeat with the skill off in the
     latest A/B baseline.

   A rule with a `keep_reason` is never a candidate. Set one when a miss
   would be severe, such as a security hole or a change that breaks shops,
   so the rule stays for weaker models even though a strong model needs no
   help.
4. The agent gets one prompt per cluster: the signals as quoted data it must
   not follow, the current text of the rules the cluster maps to, up to
   eight more rules the signals share words with (a keyword match, so an
   unmapped comment on a history comment still meets `REV-034`), up to five
   dropped rules the signals share words with (see
   [Rejected proposals](#rejected-proposals)), each with why it was dropped,
   the topics each skill owns, and the inclusion criteria from the README. The claude
   adapter runs with no tools, no MCP servers and no tokens in its
   environment.
5. The answer must match the JSON schema in the plan, at most three
   proposals per cluster. Then each proposal goes through checks that need
   no model: every evidence URL was in the prompt, the skill owns a topic in
   [`REGISTRY.md`](../../REGISTRY.md), an update or retirement names an active
   rule of that skill (`none` may name one of any skill), a new rule has
   comments from at least two PRs or a review that requested changes, and
   the proposal does not repeat an entry of `rules/rejected.json`.
6. The proposals that passed are ranked, without a model. A proposal
   scores its evidence once per PR, at the heaviest signal of that PR, so
   several PRs and trusted reviewers beat one long thread. The score
   halves when the rule is for core only (its `audience`, else the skill's
   `metadata.contexts`), because this library is for extension developers
   too. It halves again when a higher proposal of the same skill shares
   most of its words (`overlaps` names that one). The table at the top of
   the file is in rank order; draft from the top.

**Reading a proposal.** Each one has an ID (`2026-10-23-04`), the action,
skill and rule, the draft text, the eval it needs, the evidence links, the
agent's answer per criterion and the result of every check. A failed check
marks the proposal; it is still listed, so you can see what the agent got
wrong. Judge a passing one against the five criteria yourself:

- **Delta**: would a model get this wrong without the rule? A comment that
  repeats a PHPStan error is not a delta.
- **Value**: do the comments come from several PRs and reviewers, or one
  long thread? `frequency` in the answer should say which.
- **Single home**: does the proposal fit the owning skill, or does it
  restate a rule elsewhere? `none` with a rule ID is the right answer for a
  cluster the rules already cover.
- **Testable**: is the eval concrete enough to write a catch and an ignore
  diff?
- **License-clean**: the draft is in our words and links the PR, never
  quotes it.

For a retirement, open the evidence: the CI check's source and whether it
runs for extensions, the release the class left, or the A/B row. Retiring
moves the rule to `retired` in the catalog, with the evidence in
`retired_reason`, and removes it from the skill text. To have the agent write the change, see
[Drafting a proposal](#drafting-a-proposal).

### Rejected proposals

[`rules/rejected.json`](../../rules/rejected.json) lists proposals a
maintainer dropped: the proposal ID, the date, the action (`new` or
`update`), the rule ID it took, the skill, the title, the rule text, the
reason with its evidence, and the draft PR. When you close a draft PR
without merging it, add an entry; the A/B rows that showed no effect are
the usual reason. Rules that left the catalog (`retired`, `superseded:<ID>`)
count as dropped too, with their `retired_reason`.

suggest-rules uses the list twice. The prompt shows the dropped rules the
signals share words with, and the agent proposes one again only when the
signals show something its reason does not cover. Then the check `not
rejected before` fails a `new` or `update` proposal of the same skill (and,
for an update, the same rule) whose title or draft repeats at least 60% of a
rejected title's words. To bring a rejected rule back on purpose, remove its
entry in the same PR. `validate-skills.sh` checks the file's shape and that
each skill exists.

## Drafting a proposal

```bash
node tools/bin/suggest-rules.ts draft 2026-10-23-04 --no-pr   # branch and worktree only
node tools/bin/suggest-rules.ts draft 2026-10-23-04           # and a draft PR
```

`draft` takes a proposal ID from `suggestions/` that passed its checks and
is not `none`:

1. It creates the branch `rules/<skill>-<slug>` from `--base` (`main`) in a
   worktree under `.cache/drafts/`.
2. The agent makes the change by the steps in `AGENTS.md`: for a new rule
   the next free ID, the catalog entry and an eval task with golden
   fixtures; for an update the new text; for a retirement the catalog
   status and the removed bullet. It gets the proposal, not the review
   comments. Claude runs with file tools and `Bash` limited to `node`,
   `npm` scripts and the repo's own scripts, with no web tools, no MCP
   servers and no GitHub or package token.
3. The generators `AGENTS.md` names (`render-routes`, `render-enforced`,
   `render-router-index`) and `npm run format` run, then the free checks CI
   runs on every push:
   `validate-skills.sh`, the tools type check, lint and tests, the golden
   graders and Markdown lint. On a failure the agent gets the output once
   more; when the checks still fail, the command stops and leaves the
   worktree for you.
4. It commits, then runs `eval-local` for the eval tasks the change adds or
   edits, plus an updated rule's own task (`DRAFT_REPEATS`, default 3).
   The results go to `suggestions/<id>-ab.jsonl`.
5. It writes the PR body to `suggestions/<id>-pr.md`: the evidence links,
   the criteria answers, the free checks and the A/B table, row by row
   from the results file. Without `--no-pr` it pushes the branch and opens
   a draft PR with the `run-evals` label, so CI repeats the A/B. A proposal
   with private evidence never gets a PR.

`DRAFT_MODEL` (`haiku`), `DRAFT_MAX_TURNS` (60) and `DRAFT_MAX_BUDGET_USD`
(2) bound the agent. Remove a kept worktree with `git worktree remove`.

With `--agent copilot`, Copilot gets the file tools and the same commands
pre-approved, and everything else is denied. The Copilot CLI has no turn or
cost cap, so `DRAFT_TIMEOUT_SECONDS` (1200) bounds the session instead.
Locally, the token comes from `COPILOT_GITHUB_TOKEN` or your `gh` login.

## Suggesting rules in CI

[`suggest-rules.yml`](../../.github/workflows/suggest-rules.yml) runs both
steps without a laptop. It reads only public sources: the `review-signals`
release and the drift issue. Private review sources stay local.

1. **Monday 06:00 UTC**, an hour after drift mining, it runs
   `suggest-rules --since 7d` with Copilot. It uploads `suggestions/` as the
   `suggestions` artifact, kept for 90 days, and comments the ranked table
   on the open drift issue. A manual dispatch can pick `opencode`, another
   window, or no comment.
2. **Comment `/draft <ID>`** on that issue to draft a proposal from the
   table. Members and collaborators only. Add `opencode` after the ID to use
   the free model, for example while the Copilot quota is used up.
3. The job downloads the artifact of the run whose comment lists the ID. It
   accepts only a scheduled or dispatched run of this workflow on `main`,
   because a pull request can upload artifacts too. Then it runs
   `suggest-rules draft <ID>` with `DRAFT_REPEATS=2`, as in
   [Drafting a proposal](#drafting-a-proposal), and opens the draft PR.
4. It comments the outcome on the issue: the PR link, or the failed checks
   and the run link.

The agent never sees a GitHub token. The checkout keeps no credentials, and
git pushes through `gh auth git-credential`, which reads the token only
when the draft command pushes. A PR opened by the workflow token starts no
other workflow, so close and reopen it to run `validate.yml`.

Each run costs Copilot premium requests: one per cluster asked (at most
`SUGGEST_MAX_CLUSTERS`, 20) for the proposals, and one draft session plus
the A/B sessions per `/draft`. When the monthly quota is gone, every
session fails with a quota error until it resets.
