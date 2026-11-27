# Handoff 04: Issue #199 Rule Drafts, `php-modernization` Cherry-Pick, and `/mined` Wrap-up

- **Base branch:** `origin/main` (at or after `2e48485f`, post-[#198](https://github.com/BrocksiNet/ai-skills-shopware/pull/198))
- **Suggested branch (for Part B only):** `chore/drift-199-housekeeping`
- **Source issue:** [#199](https://github.com/BrocksiNet/ai-skills-shopware/issues/199) (`Drift: week of 2026-11-23`)
- **Timing:** Parts A and B can run immediately; **Part C (`/mined`) runs last**, after Handoffs 02 and 03 are merged or explicitly ticketed.
- **Prerequisite:** Read [`AGENTS.md`](../../../AGENTS.md) and [`docs/maintaining/README.md`](../../maintaining/README.md) before acting.

## Goal

Process the remaining items from weekly drift issue [#199](https://github.com/BrocksiNet/ai-skills-shopware/issues/199):

1. Triage and trigger `/draft <ID>` for the highest-value review-signal rule proposals.
2. Cherry-pick any high-value PHPStan/Rector workflow tips from `netresearch/php-modernization-skill`.
3. Close out [#199](https://github.com/BrocksiNet/ai-skills-shopware/issues/199) with `/mined` once every item is mapped, ticketed, or dismissed.

## Part A: Automated `/draft` Proposals on Issue #199

First, inspect the `suggestions` artifact of [actions run `45221711845`](https://github.com/BrocksiNet/ai-skills-shopware/actions/runs/45221711845) (via `gh run download 45221711845 -n suggestions -D /tmp/suggestions-199`) to verify the underlying PR evidence and inclusion criteria for the top-ranked proposals:

| Proposal ID | Score | Action | Skill | Extensions | Summary |
| ----------- | ----- | ------ | ----- | ---------- | ------- |
| `2026-11-23-06` | 1.62 | `new` | `sw-testing` | yes | Test cross-write DAL behavior via Sync API, not sequential single writes (note: overlaps `2026-11-23-11` and `2026-11-23-14`; draft only `-06`) |
| `2026-11-23-05` | 0.89 | `new` | `sw-admin-js` | yes | Admin privilege mappings must not grant unrestricted entity access through event logs |
| `2026-11-23-01` | 1.31 | `new` | `sw-core-development` | no | `RELEASE_INFO` entries organized by audience-specific sections |
| `2026-11-23-02` | 0.50 | `update` (`CORE-052`) | `sw-core-development` | no | Accepted ADRs are superseded by new ADRs, not modified in place |
| `2026-11-23-10` | 0.32 | `update` (`CORE-071`) | `sw-core-development` | no | Configuration keys must register schema and defaults in both places |

For each proposal whose evidence passes the 5 curation criteria in [`README.md`](../../../README.md), comment `/draft <ID>` on [#199](https://github.com/BrocksiNet/ai-skills-shopware/issues/199) (one comment per ID, or check [`tools/bin/draft-comment.ts`](../../../tools/bin/draft-comment.ts) for supported syntax) so the workflow runs the drafter + A/B check and opens a draft PR.

## Part B: `netresearch/php-modernization-skill` Cherry-Pick & Minor Doc Fixes

Inspect commit `f70a1781` (and `b953c346`) on `netresearch/php-modernization-skill` via `gh api`:

```bash
gh api repos/netresearch/php-modernization-skill/commits/f70a1781
gh api repos/netresearch/php-modernization-skill/commits/b953c346
```

Evaluate whether to adopt (in our own words — `php-modernization-skill` is CC-BY-SA, never copy verbatim):

- **Stale PHPStan/Rector caches after `git worktree remove` or vendor changes** (`rm -rf /tmp/phpstan /tmp/phpstan-* var/cache/phpstan`) and **`--memory-limit=1G`** when PHPStan hits PHP's 128M default.
  - Check whether `skills/sw-local-dev/` already covers PHPStan troubleshooting; add only if it is a concrete gap and does not duplicate `sw-core-development`'s baseline rules.
- **Unmapped drift items from [#199](https://github.com/BrocksiNet/ai-skills-shopware/issues/199) to explicitly dismiss if no change is needed:**
  - `blader/humanizer` commit `3d556c3b` (minor prose tightening already covered by `STY-001`).
  - `shopware` commit `86a0af6b` (`CLAUDE.md` bridge removal — tracked in Handoff 03 via ADR path; our repo already has no `CLAUDE.md` bridges).
- Check if `README.md` still says *"five upstream skill sets"* (if not already updated by Handoff 01, update it to match `rules/sources.json`).

If Part B modifies any files, run:

```bash
bash scripts/validate-skills.sh
bash scripts/run-activation-evals.sh
( cd tools && npm run typecheck && npm run lint && npm run format:check && npm test )
bash evals/test-graders.sh
```

## Part C: Close Out Issue #199

Once:

- Handoffs 02 and 03 are merged (or tracked in issues/PRs),
- Chosen `/draft` proposals from Part A are triggered, and
- Part B items are merged or dismissed,

post a brief triage summary comment on [#199](https://github.com/BrocksiNet/ai-skills-shopware/issues/199) and comment `/mined` so the workflow opens the PR moving `docs/.mining-state.json` forward to the `2026-11-23` commits.

## Done Criteria

- Every section of [#199](https://github.com/BrocksiNet/ai-skills-shopware/issues/199) is either implemented in a PR, drafted via `/draft`, ticketed, or explicitly dismissed.
- `/mined` PR is opened and `docs/.mining-state.json` advances cleanly.
