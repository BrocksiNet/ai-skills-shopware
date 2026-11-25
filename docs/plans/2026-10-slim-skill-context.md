# Slim skill context plan (2026-10)

Status: **proposed** (re-verified 2026-11-25) · Author: BrocksiNet · Created: 2026-10-30

Token usage went up, and the question was whether our skills cause it. They
do not: in two weeks of real sessions our skills were well under 1% of all
input tokens. The listing of our skill descriptions costs far more than the
skills we actually load, because it rides along on every request.

A re-check on 2026-11-25 sharpened the real problem: **only 8 of 332 sessions
in the previous 14 days loaded any of our skills** (0.30% listing vs 0.01%
bodies/files — a 22× ratio). Automatic hook-driven routing (**Phase 3**) is
therefore the highest-value step, primarily to fix silent non-activation rather
than to save 0.3% of input tokens, and must land before recommending
`"name-only"` overrides in Phase 2.

The goal still holds: keep only the router in context all the time and
load the rest when a change or a review needs it. This plan measures first,
then makes routing automatic and slims the listing, so no step trades
fewer tokens for skills the agent forgets to load.

## What we measured

`node tools/bin/skill-context.ts` reads the Claude Code transcripts under
`~/.claude/projects` (subagents included) and counts three things:

- **Listing:** our lines in the skill listing Claude Code sends on every
  request (name plus description).
- **Bodies:** the `SKILL.md` text Claude Code adds when a skill is invoked.
- **Files:** references, a `SKILL.md` or the router output the agent read
  with `Read` or a shell command.

A body or a file stays in context until the next compaction, so it is
counted once per request that carries it. Sizes are characters / 4.

Last 14 days on the author's machine (2026-10-16 to 2026-10-30, eval runs
left out):

| | Tokens | Share of input |
| --- | ---: | ---: |
| All input, every request | 3,584M | 100% |
| Our skill listing | 14.3M | 0.40% |
| Our skill bodies and files | 2.6M | 0.07% |

Per project, our share peaked at 2.4% in a plugin repository
(`SwagAgenticCommerce`) and 1.3% in the core checkout. 18 of 135 sessions
loaded one of our skills at all. A typical load is 500 to 2,500 tokens; the
router output is about 550.

What did fill the context, estimated the same way:

| Source | Share of input |
| --- | ---: |
| Shell command output | ~15% |
| Project instruction files (`AGENTS.md`, `CLAUDE.md`) | ~11% |
| File reads | ~8% |

One project alone loads a 60K-token `AGENTS.md` on every request. Long
sessions are the multiplier: many sessions peak near 266K tokens per
request. 97% of input tokens were cache reads, which cost a
fraction of uncached input; the per-request numbers still count against
rate limits.

## How skills reach the context today

| Piece | When it loads | How long it stays | Size (2026-11-25) |
| --- | --- | --- | --- |
| Description in the listing | Every request, from the start | Whole session | ~2,966 tokens for all 20 skills (292 to 1,005 chars each) |
| `SKILL.md` body | When the agent invokes the skill | Until compaction; afterwards re-attached, max 5K per skill, 25K in total | 600 to 3,100 tokens (`sw-extension-review` is ~3,088 tokens, 68% routes table) |
| Reference | When the agent reads it | Until compaction | 100 to 3,300 tokens |
| Router output | When the agent runs `route.mjs` | Until compaction | ~550 tokens |

Claude Code caps the whole listing at 1% of the context window. When more
skills are installed than fit, it drops descriptions of the least used
skills first, so a long description of ours can push out another skill's
trigger words, and the other way round. Source:
[Claude Code skills docs](https://code.claude.com/docs/en/skills).

## What others do

- **Compressed index instead of a decision.** Vercel's Next.js evals got
  100% with an 8KB docs index in `AGENTS.md` and at most 79% with a skill,
  because the agent never has to decide to look something up
  ([Vercel, 2026-01](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)).
  Their index is a list of pointers, not the docs themselves.
- **Hook-driven activation.** Community setups run a `UserPromptSubmit`
  hook that matches the prompt or changed files against rules and injects
  "use skill X" before the model sees the prompt
  ([claudefa.st](https://claudefa.st/blog/tools/hooks/skill-activation-hook)).
  Matching is code, so it costs no listing tokens and does not depend on
  the model noticing a description.
- **Listing control.** Claude Code's `skillOverrides` setting can show a
  skill as `"name-only"`, and `disable-model-invocation: true` removes the
  description from context entirely. `/doctor` and `/context` report what
  the listing costs.
- **Review in a subagent.** `context: fork` runs a skill in a fresh
  subagent with the skill as its prompt; only the result comes back to the
  main conversation.

## Design: router first, load late

The router already knows which skill and reference a change needs: it reads
the diff and `index.json`. The agent only has to run it. So the always-on
part shrinks to the router, and everything else loads because a file or a
task asked for it.

```mermaid
flowchart LR
  L["Listing: sw-skill-router in full,<br/>other sw- skills name only"] --> H
  H["Hook on prompt / edit:<br/>route.mjs --brief on the diff"] -->|"set changed"| N["2-5 lines: skill, reference,<br/>rule IDs, why"]
  N --> B["Build loop: read a reference<br/>before editing a file it covers"]
  B --> R["Review step in a subagent:<br/>full skills + references"]
  R --> F["Findings back to main context"]
```

### Phase 1: measure (this change)

`tools/bin/skill-context.ts` with tests. Run it before and after each phase;
the A/B eval transcripts give the same numbers per task.

### Phase 2: slim the listing (pair `"name-only"` with Phase 3)

- Shorten every description to the trigger words that decide activation,
  about 300 to 450 characters, and move the rest into the body. Today they are
  292 to 1,005 characters (`sw-plugin-development` sits 19 characters below the
  1,024-character CI limit).
- Add an install profile where only `sw-skill-router` (and `sw-help`) keep
  a full description and the other skills are `"name-only"` through
  `skillOverrides`, documented in `use-cases/` **alongside the Phase 3 hook**
  (do not recommend `"name-only"` without the hook, because baseline real-world
  activation is already low at 8/332 sessions).
- Gate: the activation evals and the A/B suite must not lose activations.
  Earlier Haiku runs skipped skills until descriptions said "load before any
  edit", so this is the step most likely to regress.

Saves 1,500 to 2,600 tokens on every request and frees the shared listing
budget for other skills.

### Phase 3: route without a decision (highest priority)

- `route.mjs --brief`: the matched skills, the references with their rule
  IDs and one-line titles, and why each matched. No skill bodies. The index
  gets the rule titles from `rules/catalog.json` at render time.
- `route.mjs --hook`: the same, but prints nothing when the set did not
  change since the last call (state in the git dir), so it can run on every
  prompt or after edits without repeating itself.
- Ship the hook wiring as a settings snippet in `use-cases/` first; a
  Claude Code plugin later, since `npx skills add` installs skills only.
- Gate: routing cases in `evals/routing/` and the replay corpus keep their
  recall floor; A/B pass rate equal or better with fewer tokens per task.

This is the Vercel lesson applied to our layout: a short index of pointers
that arrives without the agent choosing to look.

### Phase 4: load the full rules at review time

- The "check this change against the skills" step runs as a subagent:
  `sw-extension-review` and `sw-pr-review` get a forked variant (`context: fork`),
  and the router can print a ready subagent prompt for a build task. Because a
  `context: fork` subagent does not see conversation history, keep it strictly
  for self-contained review skills that read `git diff` or `gh`, not interactive
  build skills.
- The build loop keeps only the brief index and the references it read on
  purpose. The full skill text lives in the subagent and is gone after it
  returns.
- Risk: code written without the rules needs more fixes afterwards. The
  rule IDs from phase 3 are the guard; the A/B suite decides.

### Phase 5: smaller bodies (low priority / deferred)

`sw-extension-review` (~3,088 tokens; 68% is the 38-row generated routes table)
and `sw-core-development` (~2,388 tokens) are the largest `SKILL.md` files
(`sw-podman-dev` was replaced by `sw-local-dev` and removed in v0.18.0). Bodies
and files were only 0.01% of input tokens in the 2026-11-25 check, so focus on
capping long raw regexes in rendered route tables and splitting noisy
references rather than enforcing a strict token-budget gate on `SKILL.md`.

## Not part of this plan

The biggest savings are outside this repository: oversized instruction
files, very long sessions, and verbose command output. They belong in each
project's own setup; the measuring tool shows them too when run with
`--json` per session.

## Open questions

- Does `"name-only"` keep activation on Haiku and Sonnet, or does the hook
  have to come first?
- Should the hook also fire after `Edit`/`Write` (new files join the
  change), or is prompt time enough?
- Codex and Cursor have no hooks with the same shape; they keep the current
  listing until there is an equivalent.
