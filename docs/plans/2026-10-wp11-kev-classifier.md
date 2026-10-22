# WP11 in detail: a Kev classifier for the routes a diff cannot decide

Status: **draft, waiting for review.** Expands
[WP11 in the skills evolution plan](2026-10-skills-evolution.md#wp11-kev-classifier-for-on-demand-routes-experiment).
Nothing here is built yet. The sections marked **Decision** need an answer
before phase 1 starts.

## Summary

WP11 asks whether a small local decision model, Kev, can answer the
routing questions that globs and regexes cannot. Before writing code, it
measures that on a labelled set, and it builds the router hook only if Kev
beats the trivial answers.

Reading the current repo and Kev 1.0 changes three things in the original
spec:

1. **There is only one diff-shaped question today.** Three routes are
   `on_demand`. `docs-map.md` depends on what the agent is asked, and
   `when-stuck.md` on the session; neither can be read from a diff. Only
   `change-scope.md` ("A fix grows beyond the bug") is a question about a
   change. A gate on `on_demand` routes alone would decide WP11 on one
   yes/no question.
2. **Kev reads more than the plan assumed.** The plan says Kev was trained
   on texts of up to 384 tokens. Kev 1.0 validates Kev-4B up to
   8,192 tokens. A small diff can go in whole; a large one still needs the
   summary.
3. **The fine-tune fallback does not fit 30 to 50 examples.** Kev's README
   reports that 400 records gave a gain "inside the noise". A fine-tune also
   needs a Modal account and GPU time. With our set size it would measure
   nothing.

So this plan widens the question set to what `shopware-change-impact`
needs (the original step 3), labels both at once, and drops the fine-tune
fallback unless the set grows past 400.

## Kev facts this plan relies on

From the [Kev README](https://github.com/jaredpalmer/kev) and the
[Kev-4B card](https://github.com/jaredpalmer/kev/blob/main/docs/model-cards/kev-4b.md),
read 2026-10-22:

| Fact | Value |
| ---- | ----- |
| Licence | Apache-2.0, weights and code |
| Install | from source with `uv`; **not** on PyPI (`pip install kev` is an unrelated package) |
| Serve | `uv run --extra serve python -m kev.serve --run jaredpalmer/kev-4b@v1.0 --port 8009` |
| API | `POST /v1/systemone` with `state` and `questions`; `noul` answers a probability of yes, `choice` a distribution |
| Calibration | one fitted temperature per checkpoint, applied by default |
| Validated context | 8,192 tokens for Kev-0.8B, 4B and 9B |
| Speed on a Mac | Kev-4B, five questions: 721 ms for a new text on an M5, 136 ms for the same text again |
| Hardware here | M4 Pro with 48 GB; Kev-4B is measured on 32 GB Macs, Kev-9B is expected to fit |
| Their own advice | check a threshold on your own data before you rely on it |

The request and response shapes:

```json
{
  "state": "…",
  "model": "kev-latest",
  "questions": {
    "change_scope": { "type": "noul", "instructions": "Does this change go beyond fixing the bug the task describes?" },
    "blast_radius": { "type": "choice", "instructions": "How far does this change reach?",
                      "criteria": { "local": "…", "module": "…", "cross_module": "…", "public_api": "…" } }
  }
}
```

```json
{ "answers": {
    "change_scope": { "type": "noul", "noul": 0.81 },
    "blast_radius": { "type": "choice", "choice": "module", "probabilities": { "local": 0.1, "module": 0.6, "cross_module": 0.2, "public_api": 0.1 } }
} }
```

## The questions

| ID | Type | Question (`instructions`) | Who uses the answer |
| -- | ---- | ------------------------- | ------------------- |
| `change_scope` | noul | Does this change go beyond fixing the problem the task describes? | route to `shopware-review-learnings/references/change-scope.md` |
| `blast_radius` | choice | How far does this change reach: one file, one module, several modules, or a public API other extensions use? | `shopware-change-impact` |
| `upgrade_note` | noul | Does this change need an upgrade note for extension developers? | `shopware-change-impact`, `shopware-pr-description` |
| `migration` | noul | Does this change need a database migration it does not include? | `shopware-change-impact` |

`docs-map.md` and `when-stuck.md` stay `on_demand` and out of the gate.
Phase 4 has an example for `when-stuck.md` that reads the session, not a
diff.

**Decision 1: the question set.** Recommended: all four. The labelling
pass reads each change once, so the extra labels cost little, and the gate
then rests on four questions instead of one. The alternative is
`change_scope` only, which matches the original WP11 text.

## What Kev reads (the state)

One text per change, built deterministically by a new
`tools/src/change-summary.ts`:

```text
task: <issue or PR title, one line; the first paragraph of the issue body when there is one>
files:
  src/Core/Checkout/Cart/CartService.php (+12 -3)
  src/Core/Checkout/Cart/CartServiceInterface.php (+4 -0) [new public method]
signatures:
  + public function recalculate(Cart $cart, SalesChannelContext $context, bool $force = false): Cart
facts:
  touches: Store API route, event class, migration, entity definition, @internal class
  callers of changed public symbols (grep): 14 in 6 modules
diff: <the diff itself when the whole state stays under 6,000 tokens; otherwise omitted>
```

- The facts come from the same anchors the routes use, plus a grep for
  callers when a checkout is available. Without one (a fixture), the
  caller line is left out.
- The `task:` line matters for `change_scope`: "beyond the bug" needs the
  bug. Without a task the question is not asked.
- 6,000 tokens leaves room for the questions inside the validated 8,192.

## Phases

### Phase 0: run Kev locally (about an hour)

- Clone `jaredpalmer/kev` outside this repo (`~/shopware-dev/tooling/kev`),
  `uv sync --extra serve`, serve `jaredpalmer/kev-4b@v1.0`.
- Smoke check: the README's example request answers, `GET /v1/models`
  names the checkpoint, and five questions on a 2,000-token state stay
  under two seconds.
- Write down the setup in `docs/kev.md`: install, serve, pinned revision,
  and that nothing in CI needs it.

Exit: Kev answers locally from a pinned revision.

### Phase 1: the labelled set, `evals/kev/` (most of the work)

One JSON file per change in `evals/kev/cases/`:

An example (the PR number is a placeholder):

```json
{
  "id": "trunk-12345-cart-recalculate",
  "source": "https://github.com/shopware/shopware/pull/12345",
  "kind": "trunk-pr",
  "task": "Cart is not recalculated after a promotion is removed",
  "diff": "diff.patch",
  "labels": {
    "change_scope": false,
    "blast_radius": "module",
    "upgrade_note": false,
    "migration": false
  },
  "why": "One-line fix in PromotionProcessor; the test covers the reported case only."
}
```

Sources, about 40 cases:

| Kind | Count | Where from |
| ---- | ----- | ---------- |
| routing cases | 10 | `evals/routing/*/diff.patch` (have no task: no `change_scope` label) |
| eval fixtures | 10 | review and impact task diffs in `evals/tasks/` |
| trunk PRs | 15 | merged `shopware/shopware` PRs that close an issue, half small fixes, half fixes that grew (refactor, new API, migration) |
| plugin PRs | 5 | SwagAgenticCommerce and other plugin history |

Label protocol:

- I draft every label with a one-line `why` from the PR itself: the linked
  issue, the review thread, the UPGRADE file, a migration in the diff. A
  label without evidence is left out (no guess).
- You check the labels. Recommended: all `change_scope` labels and a sample
  of the rest, because "grew beyond the bug" is the judgement call.
- Balance: at least 10 positives per `noul` question; otherwise "always no"
  wins by default and the gate says nothing.
- The set is frozen before the first Kev run, and the files say so
  (`frozen: 2026-10-xx`), so thresholds are not tuned on what was labelled
  after seeing answers.

**Decision 2: labelling.** Recommended: I draft, you review a sample,
everything checked by the gate script for balance. Alternative: you label
`change_scope` yourself from scratch.

### Phase 2: the gate, `tools/bin/kev-gate.ts`

```bash
node tools/bin/kev-gate.ts --kev http://127.0.0.1:8009            # all cases
node tools/bin/kev-gate.ts --kev http://127.0.0.1:8009 --model kev-0.8b
```

- Sends each case once with all its questions, writes the raw answers to
  `evals/kev/results/<model>-<date>.json` (kept in git; small).
- Prints, per `noul` question and threshold from 0.5 to 0.95 in steps of
  0.05: accuracy, precision, recall, false-positive rate, and the same for
  the baselines "never" and "always". For `blast_radius`: accuracy and the
  confusion matrix, against "always the most common label".
- New code: `tools/src/kev.ts` (client with `fetch`, a 10-second timeout,
  type guards for the response), `tools/src/change-summary.ts`,
  `tools/src/kev-gate.ts` (metrics), and the bin. Zero runtime dependencies.
- Unit tests with recorded responses in `tools/test/fixtures/kev/`; no test
  needs a server.

The gate passes for a question when, at one threshold, Kev beats both
baselines on accuracy and its false-positive rate is below 10 %. With about
40 cases a 95 % interval is roughly ±15 points, so the result is recorded as
"passes on this set", not as a measured accuracy.

Exit: the gate result per question, with the chosen threshold, recorded in
WP11 of the main plan. Phase 3 builds only the questions that passed.

**Decision 3: models.** Recommended: Kev-4B only for the gate, plus one
run of Kev-0.8B for comparison, since it answers about five times
faster on a Mac (149 ms against 721 ms in Kev's M5 measurement). Kev-9B only
if 4B misses by a small margin.

### Phase 3: use the answers (only for questions that passed)

- `route.ts --kev <url>`: `change_scope` moves `change-scope.md` from
  `on_demand` to `selected` at the threshold. Without a server, or on an
  error, a warning and the WP4 output; the routing cases pass unchanged.
- `tools/bin/change-facts.ts`: prints the summary and Kev's answers for
  `blast_radius`, `upgrade_note` and `migration`. `shopware-change-impact`
  gets one sentence: run it when it is installed and start from its
  answers. Its eval task (`feature-impact-before-done`) must not get worse
  without Kev.

### Phase 4 (optional): stuck-loop hook example

As in the original step 4: an example Claude Code hook in `docs/examples/`
that sends the last failing tool results to Kev and adds "read
`when-stuck.md`" on yes. Not installed with the skills, no eval.

## What stays as it is

- CI never calls Kev. The routing cases, `validate-skills` and all evals
  run as today.
- Installing the skills does not need Kev. Every Kev output is advice the
  agent may follow; without it, the routes are the WP4 routes.
- `tools/` keeps zero runtime dependencies.

## Dropped from the original spec

- **The fine-tune fallback.** Not at 40 examples. If phase 2 misses by a
  small margin and the set can grow past 400 labelled changes, it is a new
  work package, with its own Modal cost.
- **The 384-token summary limit.** Replaced by the 6,000-token state above.

## Cost and time

| Phase | Effort | Money |
| ----- | ------ | ----- |
| 0 | about an hour, plus the model download (Kev-4B's weights are about 8.4 GB in bf16) | none |
| 1 | the bulk: about 40 cases, drafting and your review | none |
| 2 | about a day of tooling | none |
| 3 | one to two days, only for questions that passed | none |
| 4 | half a day, optional | none |

Every run is local on the M4 Pro. No API keys, no Modal.

## Risks

| Risk | Answer |
| ---- | ------ |
| Labels are a judgement call (`change_scope`) | evidence per label, your review, frozen before the first run |
| Too few positives, so "never" wins | balance check in the gate script; add trunk PRs until each question has 10 |
| Kev changes under us | pinned `@v1.0` revision; the result file records it |
| Gate passes on 40 cases by luck | recorded as "passes on this set"; phase 3 keeps Kev optional, so a wrong answer costs one extra or one missing reference |
| The agent trusts a confident wrong answer | outputs are worded as hints ("Kev: likely beyond the bug, 0.86"), never as findings |

## Decisions needed

1. Question set: all four (recommended) or `change_scope` only.
2. Labelling: I draft and you review (recommended), or you label
   `change_scope` yourself.
3. Models in the gate: Kev-4B plus one 0.8B run (recommended), or more.
4. Fine-tune fallback dropped (recommended), or kept as a later package.
