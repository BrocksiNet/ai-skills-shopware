# Eval suite

Proof that the skills change the model's output, not just that they exist. Three
layers, cheapest to most expensive.

## Layer 1 — activation (`../scripts/run-activation-evals.sh`)

Sends each skill's `skills/<skill>/evals/should-trigger.md` /
`skills/<skill>/evals/should-not-trigger.md` prompts to an agent and checks the
right skill loads (and the wrong ones stay quiet). Cheap; runs on every PR via CI
in `--dry` mode (file presence + prompt parsing) and for real when an agent
command is configured.

Quotes around a prompt and a trailing note such as `(-> sw-testing)` are
stripped before the prompt is sent, so the agent never sees the expected skill.

Two ready adapters run each prompt in a fresh, empty workspace that only sees
this repo's skills, with read-only tools, and print the invoked skills:

- [`runner/opencode-activation.sh`](runner/opencode-activation.sh) uses
  OpenCode with a free model. It needs no account and no API key.
- [`runner/claude-activation.sh`](runner/claude-activation.sh) uses Claude Code.

The adapters, `skills-profile.sh`, `run-task.sh` and `ab.sh` are wrappers for
TypeScript in `tools/` and need Node 24. Event parsers are tested on recorded
sessions in `tools/test/fixtures/agents/`.

```bash
SKILLS_ACTIVATION_CMD="$PWD/evals/runner/opencode-activation.sh" \
  ./scripts/run-activation-evals.sh
```

Run it before and after you change a `description`. One pass is roughly 260
short sessions. CLI/API errors abort the run without recording a score;
rerun once the provider is available. A failed session must not count as a
successful no-trigger result.

## Layer 2 — behavioral (`tasks/`)

Each `tasks/<rule>/` is a fixture task:

```text
tasks/<rule>/
├── instruction.md     # the prompt given to the agent
├── fixture/           # starting code copied into the agent's working dir
├── fixtures/pass/     # golden workdir that must PASS grade.sh (CI)
├── fixtures/fail/     # required sneak-FAIL for new graders (almost-pass)
└── grade.sh           # entry point: runs tools/graders/<task>.ts (exit 0 = pass)
```

```bash
chmod +x evals/test-graders.sh evals/tasks/*/grade.sh
./evals/test-graders.sh
```

`grade.sh` contract (env provided by the runner):

- `WORKDIR` — directory with the agent's resulting files (fixture + edits).
- `TRANSCRIPT` — path to a file containing the agent's textual output.

`grade.sh` is the same wrapper in every task: it runs
`node tools/bin/grade.ts <task>`. The checks are TypeScript in
[`tools/graders/<task>.ts`](../tools/graders/), built from the helpers in
[`tools/src/grade/kit.ts`](../tools/src/grade/kit.ts) (`findFile`, `hasLine`,
`stripComments`, `phpMethod`, `jsCallArgs`, `verdict`). Run one by hand:

```bash
WORKDIR=evals/tasks/no-empty-explicit/fixtures/pass node tools/bin/grade.ts no-empty-explicit
```

Graders prefer deterministic Shopware tooling (PHPStan/ECS/PHPUnit) and
scoped grep/AST checks over LLM-as-judge. LLM-judge is a documented fallback
for fuzzy rules only.

Check the **relationship** the rule cares about (this method, this mapping
object, this Twig block), not that tokens appear somewhere in the workdir.
PHP/JS structure graders live in [`tools/ast/`](tools/ast/) (`php-parser` +
`@babel/parser`); their `grade.sh` calls `tools/ast/run-grade.sh` instead.
Snippet tests: `cd evals/tools/ast && npm test`. A comment, leftover file,
or unused call is not a pass.
New graders must ship `fixtures/fail/` as an almost-correct sneak.

### Review tasks (`review-<rule>-catch` / `-ignore`)

Review tasks grade what an agent reports, not what it edits. They come in
pairs per rule:

- `-catch`: `fixture/diff.patch` plants the problem. The grader needs a
  finding at the right file and at least the task's minimum severity that
  explains the defect. A correct rule ID alone never passes. Extra substantive
  findings must match an explicit `allowed` expectation for another real issue.
- `-ignore`: a clean diff that looks similar. Every finding above `nit` fails
  unless the task explicitly permits it in `allowed`; unrelated false claims
  cannot pass by citing a different rule.

Near-miss tasks (`review-<topic>-near-miss`) test the rule ID, not
detection. The diff plants a real problem next to a rule that does not
cover it, the decoy. The grader (`reviewNearMiss`) needs a finding at the
file and severity whose summary describes the problem, under no catalog ID
or one of the IDs in `accept`; a finding that describes the problem and
cites the decoy fails the task. With the skill off the model cannot cite
our IDs, so these tasks do not show the skill helping. They show it
hurting, when it makes a reviewer reach for the nearest ID. The four
decoys come from a real review of a plugin: `SF-013`, `IMP-008`, `REV-033`
and `SEC-005`.

```text
tasks/review-<rule>-catch/
├── instruction.md              # "Review diff.patch", plus the findings contract
├── fixture/diff.patch          # the change under review
├── fixture/context/            # the touched files before the change
├── fixtures/pass/.transcript.txt
├── fixtures/fail/.transcript.txt
├── grade.sh                    # the wrapper; tools/graders/<task>.ts calls reviewCatch or reviewIgnore
└── skills
```

The agent ends its answer with one fenced `json` block:

```json
{"findings": [{"rule_id": "PLG-027", "severity": "major", "file": "src/…",
  "line": 13, "summary": "…", "fix": "…"}]}
```

`severity` is `blocking`, `major`, `minor` or `nit`; `rule_id` may be null.
[`tools/src/grade/review.ts`](../tools/src/grade/review.ts) reads the last
such block from `$TRANSCRIPT`. Its `summary` must match the task's defect
description even when its `rule_id` is correct. Catalog IDs must match exactly;
no catalog ID is also accepted unless `requireCitation: true` explicitly
makes attribution part of the task. The regex keeps the eval fair
with the skill off, when the model cannot know our IDs: A/B compares
detection, not ID recall. A different catalog ID is a wrong rule.

Golden transcripts: the `-catch` fail sneak has the right rule as a `nit`
and a wrong catalog ID at `major`; the `-ignore` fail sneak reports the
look-alike as a problem. The pristine `fixture/` has no transcript, so it
fails both graders without `.skip-fixture-grade`.

## Layer 3 — A/B ablation (`runner/`)

- `runner/run-task.sh <task> <on|off>` — copy the fixture into a temp workdir,
  turn the skill set on or off for that workdir, invoke the agent, capture the
  transcript, remove the skill profile, then run `grade.sh`. Exit `0` pass,
  `1` fail, `4` agent error (never counted as a fail), `3` no agent configured.
  An agent error, such as "Rate limit exceeded" on a free model, is retried
  `EVAL_AGENT_RETRIES` times (default 2), `EVAL_AGENT_RETRY_WAIT` seconds apart
  (default 60), on a fresh copy of the fixture. The reason is logged.
  `EVAL_AGENT_TIMEOUT_SECONDS` stops a hung agent and counts an agent error.
  A used-up quota (OpenCode's "Free usage limit reached", Copilot's "exceeded
  your monthly quota", a Claude or Codex plan limit) is not retried: exit `6`.
  `ab.sh` then writes `$EVAL_RESULTS.quota` and records every later run with
  that results file as an agent error without starting the agent, so a CI
  shard ends in minutes instead of retrying for hours. Delete the file to
  retry after the quota resets.
- Unit tests in `tools/test/ab.test.ts` drive both with
  `runner/fake-agent.sh`.
- `runner/ab.sh <task> [repeats]` — run both modes `repeats` times, print the
  comparison and append one JSON line to `$EVAL_RESULTS`
  (default `evals/.results/ab.jsonl`):

  ```json
  {"task":"dal-search-without-limit","repeats":3,"on":3,"off":1,"on_done":3,"off_done":3,"errors":0,"delta":2,"verdict":"improved","loaded_on":3,"loaded_off":0,"tokens_on":{"input":41230,"output":2104,"runs":3},"tokens_off":{"input":28770,"output":1950,"runs":3},"agent":"opencode","model":"opencode/longcat-2.5-preview-free","sha":"c641789","ts":"2026-10-20T06:00:00Z"}
  ```

Pass rates count completed runs only; an agent error is not a failed task. A
gap below `EVAL_AB_MIN_DELTA_PCT` points (default 50) is below the reporting
threshold: with 3 repeats one run is 33 points. This heuristic is not a
statistical test, and `held` or `no_difference` never establishes equivalence
or justifies retiring a rule. Trials run in randomly ordered on/off pairs.

| Verdict | Meaning | `ab.sh` exit |
| ------- | ------- | ------------ |
| `improved` | skill-on pass rate is at least the minimum gap higher | 0 |
| `held` | every completed run passed in both modes; a ceiling on these trials | 11 |
| `no_difference` | the gap is below the minimum | 10 |
| `worse` | skill-on pass rate is at least the minimum gap lower | 20 |
| `error` | fewer than half of a mode's runs completed; no verdict | 5 |

`ab.sh` refuses to run without a profile command, because "on" and "off" would
otherwise load the same skills.

### Complete experiments and retained evidence

`eval-local.sh` freezes `<results>.manifest.json` before running any task.
It records the experiment ID, full task plan, repeat count, agent, model and
commit. Use a fresh `EVAL_RESULTS` path for each experiment. CI carries the
same full plan across shards and checks it after merging their results.

The gate rejects missing or duplicate tasks, mixed experiment IDs, mismatched
profiles or commits, and missing or inconsistent trial records. Historical
results without a manifest remain readable with an explicit completeness
warning. Set `EVAL_MANIFEST` to require a particular manifest; an absent
explicit file is an error.

Each new A/B record includes per-trial outcomes, duration, loaded skills,
tokens, content hashes for the task/skills/grader, and a relative artifact
directory. `<results>.artifacts/` retains stdout, stderr, usage, skill logs,
raw adapter events and an incrementally written trial journal. This evidence
survives workdir cleanup; CI uploads it even when a shard fails. Retry traces
can contain earlier attempts; the aggregate skill/token counts still use only
the final attempt. Review a sample of transcripts before interpreting scores.

A task that only works with a tool the skill runs names it in an `expect-tool`
file (one substring of the command, e.g. `shopware-api-index`). The A/B then
counts the runs whose trace shows a shell command containing it, records
`ran_on` / `ran_off` and prints `ran the tool: on n/N, off n/N`. A reference
the agent only read does not count. A low pass rate with `ran_on` 0 says the
agent never got to the tool (activation, or it preferred the web), not that
the tool does not help; look at `skill loaded` next.

The stricter review graders change the measurement: do not compare their scores
directly with older baselines as if only the skills changed.

### Router/help consolidation pilot

```bash
# Prepare packages without any model calls:
node tools/bin/eval-discovery.ts /tmp/shopware-discovery-packages --prepare

# A bounded model screen: three tasks, three packaging variants, fresh workdirs.
EVAL_AGENT=claude TASK_MODEL=haiku REPEATS=1 \
  SKILLS_AGENT_CMD="$PWD/evals/runner/claude-task.sh" \
  node tools/bin/eval-discovery.ts evals/.results/discovery-new-run --run
```

The variants are the current library, router/help merged into one entry point,
and both discovery entry points removed. The merged package derives its guide
from the maintained help skill and retains the existing router and topic
references. It does not change the published skills. Runtime packages are
copied outside the checkout so ancestor documentation cannot restore removed
guidance. Tasks have an explicit selection budget and grade skill selection;
they do not establish implementation quality or statistical non-inferiority.
An infrastructure error stops further model sessions and records the remaining
trials as skipped. The manifest, trial journal, packages and raw traces stay
in the output directory. Expand to held-out tasks and supported models before
making a packaging or retirement decision.

### Prospective reference and code transfer comparison

```bash
# Freeze the plan/packages without spending model usage:
node tools/bin/eval-transfer.ts /tmp/shopware-transfer-plan --prepare

# A NEW output directory is required for each run (18 sessions by default):
EVAL_AGENT=claude TASK_MODEL=haiku REPEATS=2 TASK_MAX_TURNS=18 \
  TASK_MAX_BUDGET_USD=0.50 EVAL_AGENT_TIMEOUT_SECONDS=180 \
  SKILLS_AGENT_CMD="$PWD/evals/runner/claude-task.sh" \
  node tools/bin/eval-transfer.ts evals/.results/transfer-new-run --run
```

[`experiments/discovery-transfer-v1.json`](experiments/discovery-transfer-v1.json)
lists three retained tasks and their expected domain references. Each task/repeat runs
all three packages in shuffled order, in fresh workdirs with the complete
variant installed. No task names its expected reference. Packages, task/grader
hashes, limits and trial order are recorded before the first model call.

Two outcomes are reported independently: successful code outcomes and confirmed
reference content returned to the agent. The Claude trace observer counts
successful `Read` results with matching source content, or literal shell file
reads with matching returned content; partial excerpts are marked. Citations, file listings, path echoes
and failed calls do not count. Dynamic shell paths and implicit cwd changes may
still be missed; missing or
unsupported traces are unobservable, rather than zero-retrieval results.
Reading a reference does not prove comprehension or causal use. Other reference
reads are recorded without assuming they are mistakes.

Two hidden oracles execute the generated Storefront/Administration JavaScript
against a small fixture adapter: option compatibility including zero and inherited
save ordering/results/rejection.
The worker-reset case checks PHP AST relationships and service configuration;
it does **not** execute Symfony, PHP or Messenger. Golden almost-pass answers
and calibration mutations check these oracles before model trials.
Install the existing AST dependencies with `npm ci --prefix evals/tools/ast`
before running the transfer comparison or its `tools/` unit tests.

Each trial retains the edited fixture, grader output, usage and raw events under
`trials/`; `summary.json` separates code failures from infrastructure errors and
unobservable retrieval. An infrastructure error stops later sessions. This
runner currently requires the Claude adapter because other event formats have
not been calibrated for reference observation.

The [first-run record](../docs/evidence.md#skill-experiments) retains all
24 raw trials. Its cancellation task was invalidated because the prompt and
fixture did not establish the teardown API assumed by the oracle; that task is
excluded from the primary comparison and removed from the active task set.

These tasks were prospective holdouts for the first frozen run only. After
inspection they are regression cases. Do not tune the package or grader on these
results and describe reruns as held-out evidence. A small sample on one model
cannot establish equivalence or justify retiring a skill; use new task families
and additional supported model profiles for confirmation.

### Fact-sensitive regression comparison across models

```bash
# No model calls; freezes all three model schedules and archives exact inputs:
node tools/bin/eval-transfer-suite.ts /tmp/shopware-facts-preview --prepare

# A different NEW directory; 54 serial regression sessions, no retries:
node tools/bin/eval-transfer-suite.ts evals/.results/facts-new-run --run
```

The [protocol](experiments/facts-transfer-v2.json) replays three consumed cases, the
current/merged/removed packages, Haiku/Sonnet/Opus, and two repeats per arm.
The runner uses the logged-in Claude CLI with the same tools and limits for
every model: 22 turns, $1.50 session budget and 240 seconds. Actual returned
model IDs, cap terminations, usage and edited fixtures are retained. Preparation
archives the task/fixture/golden inputs, grader and runner sources, dependency
locks and published skill source. Source and package hashes are checked before
and after each model; changing them invalidates continuation.

These prompts explicitly request checking installed local guidance and reading
relevant references, without naming a file or the required API. This measures
guidance-directed retrieval, and cannot be compared causally with the earlier
unprompted read rate. Before the first run, live positive read controls on all
three models verified that returned reference content is observable.

The cache case checks the earliest supported minor's API capability and matching
invalidation tags through PHP AST paths. The Administration field case executes
actual Vue 2.7.14 and 3.3.4 compiler output with the edited component's save
method. The ACL case executes the imported registration and checks role
resolution plus migration helper arguments. The adapters use the pinned source
links in the protocol; no browser, PHP interpreter, database or Shopware kernel
is involved. Unsupported PHP/Vue adapter rewrites are ungradable infrastructure
errors, not model failures. The ACL task was repaired after the first run to
state persisted-role snapshots and an unshipped migration explicitly; its
original scores are excluded from the [first-run record](../docs/evidence.md#skill-experiments).

The primary retrieval measure is a trial returning **at least one** acceptable
fact-bearing reference. The cache task permits either of two references; reading
both is unnecessary. Code passes, retrieval, costs and capped sessions are
reported separately. These are three authored task families, two sharing an
Administration reference, across one provider's model family. This small,
correlated sample cannot establish equivalence or causally attribute a fix to
a reference read. These cases are now regression data. To run fresh tasks, first register a new
protocol under `evals/experiments/` with `models`, `repeats` and `cases`, then
pass `EVAL_TRANSFER_PLAN=evals/experiments/<new-protocol>.json`. Do not tune these
cases and describe a replay as held out. Fresh workdirs do not restrict access
to other local skill installations; a clean environment is needed to isolate
package effects.

Ready adapters:

| Adapter | Agent | Needs | Default `TASK_MODEL` |
| ------- | ----- | ----- | -------------------- |
| `runner/opencode-task.sh` | OpenCode CLI v2 | nothing for free models | `opencode/mimo-v2.6-flash-free` |
| `runner/copilot-task.sh` | GitHub Copilot CLI | `COPILOT_GITHUB_TOKEN` (locally `gh auth token`) | `claude-haiku-4.5` |
| `runner/claude-task.sh` | Claude Code CLI | `ANTHROPIC_API_KEY` or `claude auth login` | `sonnet` |

```bash
export SKILLS_AGENT_CMD="$PWD/evals/runner/opencode-task.sh"     # edits the workdir
export SKILLS_PROFILE_CMD="$PWD/evals/runner/skills-profile.sh"  # on|off <workdir> <task>
./evals/runner/ab.sh dal-search-without-limit 3
```

`skills-profile.sh` symlinks the task's `skills` file entries (all skills when
the file is missing) into `.claude/skills` and `.agents/skills` of the workdir.
All adapters keep machine-wide skills out of the "off" run:
`opencode-task.sh` and `copilot-task.sh` run with a throwaway `HOME` (and
`COPILOT_HOME`), and `claude-task.sh` passes `--setting-sources project`.
`copilot-task.sh` has no turn cap; it stops after `TASK_TIMEOUT_SECONDS`. Both cap each session at `TASK_MAX_TURNS`
(default 12). `opencode-task.sh` also stops after `TASK_TIMEOUT_SECONDS`
(default 600) and records that as an agent error. `claude-task.sh` also caps
spend with `TASK_MAX_BUDGET_USD` (default 0.75). Hitting a turn or budget cap
is graded like any attempt.

### Pick a model that loads skills

An A/B only measures a skill when the model actually loads it. Many models
ignore available skills unless the prompt names them; then "on" and "off" are
the same run and every task comes out `held`. Both adapters therefore report
the skills they loaded (`EVAL_SKILLS_LOG`), `ab.sh` records `loaded_on` and
`loaded_off`, and the gate fails when too few skill-on runs load a task skill.

### Token use

Both adapters also write each session's tokens to `EVAL_USAGE_LOG`. Input
counts cache reads and writes too, because that is the context the model
processed. `ab.sh` records the average per completed run as `tokens_on` and
`tokens_off`; agent errors and failed retry attempts are left out. Adapters
that cannot report give `null`.

To check that a skill change does not make runs more expensive, run the same
tasks on `main` and on the branch, then compare:

```bash
git checkout main && EVAL_RESULTS=/tmp/main.jsonl REPEATS=3 EVAL_TASKS=prepare-plugin-for-6-8 bash scripts/eval-local.sh
git checkout - && EVAL_RESULTS=/tmp/branch.jsonl REPEATS=3 EVAL_TASKS=prepare-plugin-for-6-8 bash scripts/eval-local.sh
bash scripts/eval-diff.sh /tmp/main.jsonl /tmp/branch.jsonl
```

`eval-diff.sh` prints a "Tokens per skill-on run" table with the change in
percent. Three runs per mode are noisy; read a change under about 10 % as no
change.

Free OpenCode models measured on 2026-10-20 (8 tasks, skill on, one run each):

| Model | Loaded a task skill | Passed | Avg. session |
| ----- | ------------------- | ------ | ------------ |
| `opencode/longcat-2.5-preview-free` (gone since 2026-10-23) | 5/8 | 5/8 | ~115 s |
| `opencode/mimo-v2.6-flash-free` (default) | 5/8 | 5/8 | ~115 s |
| `opencode/big-pickle` | 2/8 | 5/8 | ~115 s |
| `opencode/nemotron-3-ultra-free` | 1/8 | 6/8 | ~35 s |
| `opencode/nemotron-3.5-lightning-free` | 0/8 | 4/8 | ~35 s |

The other listed free models answered "Model unavailable". Free models are
offered for a limited time and change; list the current ones with
`opencode models --standalone` and re-measure before you switch. MiMo, Big
Pickle and the Nemotron endpoints log prompts to improve their models; LongCat
is not on OpenCode's list of exceptions to zero retention. The eval fixtures
are public code either way.

Other agents work through the same contract: `SKILLS_AGENT_CMD` reads the prompt
on stdin, works in the current directory, prints its transcript, and exits
non-zero only on a CLI/API failure. The legacy `SKILLS_PROFILE_ON_CMD` /
`SKILLS_PROFILE_OFF_CMD` hooks still work.

### Run locally with the agents you are logged in to

`scripts/eval-local.sh` runs the A/B with a CLI you are already logged in to
and applies the same gate as CI. It needs no API key and no rate-limited free
tier.

```bash
# Claude Code with your `claude auth login` session (default model haiku)
EVAL_TASKS=prepare-plugin-for-6-8 REPEATS=3 scripts/eval-local.sh

# Your Copilot seat: the token comes from `gh auth token` (default model claude-haiku-4.5)
EVAL_LOCAL_AGENT=copilot EVAL_TASKS=review-admin-area-pattern-catch scripts/eval-local.sh

# OpenCode with the free model, or a provider you added with an API key
EVAL_LOCAL_AGENT=opencode scripts/eval-local.sh
```

OpenCode and Copilot run with a throwaway `HOME`, so your global skills stay
out of the "off" run. OpenCode copies only your `auth.json` in
(`OPENCODE_AUTH_FILE`). OpenCode 2.0.27 keeps its GitHub Copilot login in its
database, not in `auth.json`, so `github-copilot/*` models are "unavailable"
there; use `EVAL_LOCAL_AGENT=copilot`. On your own machine,
`COPILOT_TASK_READ_ONLY=1` limits Copilot to the skill tool and read-only
tools, which is all a `review-*` task needs.
Results land in `evals/.results/local-<timestamp>.jsonl`.

Measured on 2026-10-20 with Claude Haiku (3 repeats): `prepare-plugin-for-6-8`
went from 0/3 without the skill to 3/3 with it, and to 0/3 with a deliberately
wrong rule in `sw-plugin-development`, which turned the gate red.

### Gate, diff and plan

- `scripts/eval-gate.sh <ab.jsonl>` prints a Markdown summary and fails when a
  task got `worse`, when fewer than 70 % of graded tasks pass every skill-on
  run, when more than 25 % ended in agent errors, when fewer than 50 % of
  skill-on runs loaded a task skill, or when a skill-off run loaded a repo
  skill. Override with `EVAL_GATE_MIN_PASS_PCT`, `EVAL_GATE_MAX_ERROR_PCT` and
  `EVAL_GATE_MIN_LOAD_PCT`.
- `scripts/eval-diff.sh <old.jsonl> <new.jsonl>` lists tasks whose verdict or
  skill-on pass rate changed.
- `scripts/eval-plan.sh` picks tasks (`EVAL_TASKS`, `EVAL_CHANGED_FILES`,
  `EVAL_MAX_TASKS`) and splits them into `EVAL_SHARDS` shards for CI.
- The three scripts are wrappers for `tools/bin/eval-*.ts` and need Node 24.
  The logic and its unit tests live in `tools/src/` and `tools/test/`.
- The unit tests in `tools/test/` drive all of the above, and the shell
  wrappers, with [`runner/fake-agent.sh`](runner/fake-agent.sh) instead of a
  model. They run on every push, so a runner change that would turn a broken
  eval green fails first.

### Model evals in CI (`evals.yml`)

| Trigger | Agents | Tasks | Activation | Baseline PR |
| ------- | ------ | ----- | ---------- | ----------- |
| Monthly schedule (1st, 06:00 UTC) | `opencode`, `copilot` | all, 3 repeats | yes | yes, one per agent |
| PR labeled `run-evals` | `copilot` | tasks whose folder changed or that load a changed skill | no | no |
| Manual dispatch | `agents` input (default `copilot`) | `tasks`, `repeats`, `max_tasks`, `shards`, `model` inputs | `activation` input | `baseline` input |

Each agent of a run is a profile (`tools/bin/eval-profiles.ts`, default models
in `tools/src/adapters.ts`). The A/B shards, the gate and the baseline run
once per profile, so each model gets its own `gate` check and its own
baseline file. Two models make the keep-or-retire call safer than one:
retire a rule only when no profile shows an effect.

`opencode` uses a free model and needs no secret, but on the GitHub runners
the free models answer "Free usage limit reached" (November 2026), so labeled
PRs and dispatch default to `copilot`. The monthly run keeps both; the
preflight drops a model that does not answer. `copilot` needs the
repository secret `COPILOT_GITHUB_TOKEN`: a fine-grained personal access token
of a user with a Copilot seat, with the account permission "Copilot Requests".
Its runs cost that user's premium requests. With `claude-haiku-4.5` a session
costs a third of one, so a full run (about 900 sessions) costs about 300, and
one task A/B with 3 repeats about 2. Before the shards start, the plan job runs one tiny session
per model (`tools/bin/agent-preflight.ts`). A model that does not answer
(gone, "Model unavailable", or a used-up free quota) is dropped from the run
with a warning in the job summary, instead of every shard retrying agent
errors for hours. The other models still run; the run fails only when no
model answers. `agents=claude`
on dispatch uses Claude Code and needs the repository secret
`ANTHROPIC_API_KEY`. A run whose agent misses its secret fails on purpose.

For baseline PRs, enable *Settings > Actions > General > Allow GitHub Actions to
create and approve pull requests*. Without it, the baseline job fails and the
results stay available as the `eval-results-<agent>` artifact.

Baselines land in `evals/baselines/<YYYY-MM-DD>-<agent>.jsonl` through a bot
PR per agent. Each gate's summary shows the diff against the newest committed
baseline of the same agent.

## Harbor (`harbor/`)

For containerized, parallel, multi-agent runs, [`harbor/`](harbor/README.md)
wires the same tasks into [Harbor](https://github.com/harbor-framework/harbor)
(`claude-code` / `codex` agents, `instruction.md` + `tests/test.sh`).

## Smoke evals (local A/B)

[`smoke/`](smoke/) — skills ON vs OFF with Claude, Codex, or Cursor CLI.
Guide: [`docs/smoke-evals.md`](../docs/smoke-evals.md).

```bash
./evals/smoke/smoke.sh agents
./evals/smoke/smoke.sh ab --agent claude --task no-empty-explicit
```

## Cost note

Layers 2-3 call real models. They run in CI only behind a label, the monthly
schedule or a manual dispatch (see `../.github/workflows/evals.yml`), never on
every push. A full run is about 64 tasks x 2 modes x 3 repeats, so roughly 380
short sessions plus about 260 activation prompts. With the default free
OpenCode model this costs nothing; a session takes about two minutes, so CI
splits a full run across 8 parallel jobs. With `agent=claude`, CI caps each task session at USD 0.50
(`TASK_MAX_BUDGET_USD`). Use `max_tasks` or `tasks` on dispatch for smaller
runs.

## CI on every push (no model calls)

[`../.github/workflows/validate.yml`](../.github/workflows/validate.yml) also runs:

- `bash scripts/validate-skills.sh` + activation evals in dry mode
- `npm test` in `tools/` (eval pipeline with a fake agent, plus the repo tooling)
- ShellCheck on repo shell scripts (see workflow for paths)
- `node --test` in `evals/tools/ast` plus `bash evals/test-graders.sh`
- Markdown lint on all `*.md` files
