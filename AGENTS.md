# Agent guide — ai-skills-shopware

This repository is a **curated Agent Skills library** for Shopware 6 development.
It is not a Shopware instance — there is no `vendor/`, no kernel, and no runtime
to boot. Work here means authoring skills, references, and eval tasks, then
proving they change model behavior.

Human onboarding: [`README.md`](README.md). Skill ownership and topic boundaries:
[`REGISTRY.md`](REGISTRY.md).

## Repository layout

```text
skills/<skill-name>/
  SKILL.md                    # frontmatter + progressive-disclosure body
  references/*.md             # loaded on demand from SKILL.md links
  evals/should-trigger.md       # activation eval prompts (must trigger)
  evals/should-not-trigger.md   # activation eval prompts (must stay quiet)

evals/tasks/<task-name>/
  instruction.md              # prompt given to the agent
  fixture/                    # starting code (negative / pristine case)
  fixtures/pass/              # golden workdir that must PASS grade.sh
  fixtures/fail/              # optional golden FAIL case
  grade.sh                    # deterministic grader (exit 0 = pass)
  skills                      # optional: extra skills for smoke A/B (one name per line)

evals/smoke/                  # local A/B harness (Claude, Codex, Cursor CLI)
evals/runner/                 # generic A/B runner (SKILLS_AGENT_CMD)
evals/harbor/                 # containerized Harbor wiring (optional)
evals/test-graders.sh         # golden tests for all grade.sh scripts

scripts/
  validate-skills.sh          # structure, budgets, REGISTRY conflicts
  run-activation-evals.sh     # Layer 1 activation checks
  check-update.sh             # compare pinned version vs latest release tag

use-cases/                    # canonical `npx skills add` one-liners
docs/                         # local validation, smoke evals, tooling stack
.github/workflows/
  validate.yml                # cheap CI on every push (no model calls)
  evals.yml                   # model evals (gated: schedule, label, dispatch)
```

Skills install into provider-specific folders (`.cursor/skills/`, `.claude/skills/`,
`.codex/skills/`, `.agents/skills/`) via [`skills.sh`](https://github.com/vercel-labs/skills).
This repo **authors** those folders; it does not contain installed copies.

## Before you change anything

Run the deterministic checks (same as CI):

```bash
bash scripts/validate-skills.sh
bash scripts/run-activation-evals.sh
bash evals/test-graders.sh
```

ShellCheck (optional locally; required in CI):

```bash
mapfile -t files < <(
  find evals/smoke evals/runner scripts evals -maxdepth 1 -name '*.sh' -type f | sort
)
shellcheck "${files[@]}"
```

Smoke harness — graders only (no API cost):

```bash
./evals/smoke/smoke.sh graders
./evals/smoke/smoke.sh agents    # list agent CLI availability
```

## Eval layers

| Layer | What | Cost | CI |
| ----- | ---- | ---- | -- |
| 0 | `validate-skills.sh`, ShellCheck, golden graders, markdown lint | free | every push |
| 1 | Activation — right skill loads for trigger phrases | agent API | dry on push; real in `evals.yml` |
| 2 | Behavioral — `evals/tasks/<task>/` + `grade.sh` | agent API | via `evals.yml` when configured |
| 3 | A/B ablation — skill on vs off | agent API | `evals/runner/ab.sh` or `evals/smoke/smoke.sh suite` |

Details: [`evals/README.md`](evals/README.md). Local A/B smoke:
[`docs/smoke-evals.md`](docs/smoke-evals.md).

### Grader contract

Graders receive:

- `WORKDIR` — directory with fixture + agent edits
- `TRANSCRIPT` — path to the agent's textual output

Prefer grep/AST and project tooling (PHPStan, ECS, PHPUnit via `vendor/bin/`
when present) over LLM-as-judge. Golden fixtures in `fixtures/pass/` and
`fixtures/fail/` are tested by `evals/test-graders.sh` on every push.

## Adding or changing a rule

1. Confirm the [five inclusion criteria](README.md#curation--governance) in README.
2. Assign the topic to **exactly one** skill in [`REGISTRY.md`](REGISTRY.md)
   coverage matrix — never duplicate ownership.
3. Write the rule in the owning `SKILL.md` (or `references/*.md` if long).
   Link references from `SKILL.md`; `validate-skills.sh` checks dead links.
4. Add activation prompts under `skills/<skill>/evals/`.
5. Add a behavioral task under `evals/tasks/<rule>/` with `grade.sh` and golden
   fixtures (`fixtures/pass/` required when the rule is gradable).
6. Re-run `validate-skills.sh` and `evals/test-graders.sh`.

For recurring real-world findings, prefer `shopware-review-learnings` and point
at the owning skill rather than re-defining the topic.

## Adding a skill

1. Create `skills/<name>/` with `SKILL.md` (`name` must match folder).
2. Keep `description` under 1024 chars and `SKILL.md` under 500 lines.
3. Add `evals/should-trigger.md` and `evals/should-not-trigger.md`.
4. Register the skill and its topics in [`REGISTRY.md`](REGISTRY.md).
5. Add install lines to README / relevant `use-cases/*.md` if it is a new
   use-case surface skill.

## Smoke eval defaults

Default tasks (see `evals/smoke/smoke.env.example`):

`no-empty-explicit`, `backed-enum-over-constants`, `unit-test-passes`,
`clock-interface-injection`, `unit-test-exception-object`, `interface-di-repository`,
`cache-tag-no-deprecated-event`, `phpstan-baseline-guardrail`,
`core-http-client-behind-flag`.

Default agents: `claude codex cursor`. Cursor uses `agent login` locally; admin
`crsr_` keys are ignored by the smoke harness.

## What not to do here

- Do not run host `php`, `composer`, or `phpunit` against a Shopware tree from
  this repo — there is none. Test graders use fixture workdirs only.
- Do not add rules without an eval — untested guidance belongs in docs, not skills.
- Do not copy upstream skills verbatim — rewrite in our words; see README credits
  and license notes in REGISTRY.

## Related docs

| Doc | Purpose |
| --- | ------- |
| [`docs/core-pr-17657-alignment.md`](docs/core-pr-17657-alignment.md) | Rule checklist mined from core PR #17657 (we own skills, not core’s in-repo copies) |
| [`docs/local-validation.md`](docs/local-validation.md) | Dogfood skills on a real Shopware instance |
| [`docs/tooling-stack.md`](docs/tooling-stack.md) | ai-skills-shopware vs shopware-ai-coding-tools MCP |
| [`docs/smoke-evals.md`](docs/smoke-evals.md) | Local A/B smoke harness |
| [`evals/harbor/README.md`](evals/harbor/README.md) | Containerized parallel eval runs |
