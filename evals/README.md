# Eval suite

Proof that the skills change the model's output, not just that they exist. Three
layers, cheapest to most expensive.

## Layer 1 — activation (`../scripts/run-activation-evals.sh`)

Sends each skill's `skills/<skill>/evals/should-trigger.md` /
`skills/<skill>/evals/should-not-trigger.md` prompts to an agent and checks the
right skill loads (and the wrong ones stay quiet). Cheap; runs on every PR via CI
in `--dry` mode (file presence + prompt parsing) and for real when an agent
command is configured.

Quotes around a prompt and a trailing note such as `(-> shopware-testing)` are
stripped before the prompt is sent, so the agent never sees the expected skill.

Two ready adapters run each prompt in a fresh, empty workspace that only sees
this repo's skills, with read-only tools, and print the invoked skills:

- [`runner/opencode-activation.sh`](runner/opencode-activation.sh) uses
  OpenCode with a free model. It needs no account and no API key.
- [`runner/claude-activation.sh`](runner/claude-activation.sh) uses Claude Code.

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
└── grade.sh           # deterministic grader (exit 0 = pass)
```

```bash
chmod +x evals/test-graders.sh evals/tasks/*/grade.sh
./evals/test-graders.sh
```

`grade.sh` contract (env provided by the runner):

- `WORKDIR` — directory with the agent's resulting files (fixture + edits).
- `TRANSCRIPT` — path to a file containing the agent's textual output.

Graders prefer deterministic Shopware tooling (PHPStan/ECS/PHPUnit) and
scoped grep/AST checks over LLM-as-judge. LLM-judge is a documented fallback
for fuzzy rules only.

Check the **relationship** the rule cares about (this method, this mapping
object, this Twig block), not that tokens appear somewhere in the workdir.
PHP/JS structure graders live in [`tools/ast/`](tools/ast/) (`php-parser` +
`@babel/parser`); `grade.sh` is a thin wrapper that prints one `score=` line.
Snippet tests: `cd evals/tools/ast && npm test`. Bash helpers in
[`grade-helpers.sh`](grade-helpers.sh) stay for comments-as-subject and
Twig/XML/markdown. A comment, leftover file, or unused call is not a pass.
New graders must ship `fixtures/fail/` as an almost-correct sneak.

## Layer 3 — A/B ablation (`runner/`)

- `runner/run-task.sh <task> <on|off>` — copy the fixture into a temp workdir,
  turn the skill set on or off for that workdir, invoke the agent, capture the
  transcript, remove the skill profile, then run `grade.sh`. Exit `0` pass,
  `1` fail, `4` agent error (never counted as a fail), `3` no agent configured.
- `runner/ab.sh <task> [repeats]` — run both modes `repeats` times, print the
  comparison and append one JSON line to `$EVAL_RESULTS`
  (default `evals/.results/ab.jsonl`):

  ```json
  {"task":"dal-search-without-limit","repeats":3,"on":3,"off":1,"errors":0,"delta":2,"verdict":"improved","agent":"opencode","model":"opencode/nemotron-3-ultra-free","sha":"c641789","ts":"2026-10-20T06:00:00Z"}
  ```

| Verdict | Meaning | `ab.sh` exit |
| ------- | ------- | ------------ |
| `improved` | skill on passed more runs than skill off | 0 |
| `held` | both passed every run; the model may not need the rule | 11 |
| `no_difference` | equal, but not every run passed | 10 |
| `worse` | skill on passed fewer runs | 20 |
| `error` | an agent error in any run; no verdict | 5 |

`ab.sh` refuses to run without a profile command, because "on" and "off" would
otherwise load the same skills.

Ready adapters:

| Adapter | Agent | Needs | Default `TASK_MODEL` |
| ------- | ----- | ----- | -------------------- |
| `runner/opencode-task.sh` | OpenCode CLI v2 | nothing for free models | `opencode/nemotron-3-ultra-free` |
| `runner/claude-task.sh` | Claude Code CLI | `ANTHROPIC_API_KEY` or `claude auth login` | `sonnet` |

```bash
export SKILLS_AGENT_CMD="$PWD/evals/runner/opencode-task.sh"     # edits the workdir
export SKILLS_PROFILE_CMD="$PWD/evals/runner/skills-profile.sh"  # on|off <workdir> <task>
./evals/runner/ab.sh dal-search-without-limit 3
```

`skills-profile.sh` symlinks the task's `skills` file entries (all skills when
the file is missing) into `.claude/skills` and `.agents/skills` of the workdir.
Both adapters keep machine-wide skills out of the "off" run:
`opencode-task.sh` runs with a throwaway `HOME`, and `claude-task.sh` passes
`--setting-sources project`. Both cap each session at `TASK_MAX_TURNS`
(default 12). `opencode-task.sh` also stops after `TASK_TIMEOUT_SECONDS`
(default 600) and records that as an agent error. `claude-task.sh` also caps
spend with `TASK_MAX_BUDGET_USD` (default 0.75). Hitting a turn or budget cap
is graded like any attempt.

OpenCode's free models are offered for a limited time and change. List the
current ones with `opencode models --standalone`. Some free providers log
prompts to improve their models; the eval fixtures are public code.

Other agents work through the same contract: `SKILLS_AGENT_CMD` reads the prompt
on stdin, works in the current directory, prints its transcript, and exits
non-zero only on a CLI/API failure. The legacy `SKILLS_PROFILE_ON_CMD` /
`SKILLS_PROFILE_OFF_CMD` hooks still work.

### Gate, diff and plan

- `scripts/eval-gate.sh <ab.jsonl>` prints a Markdown summary and fails when a
  task got `worse`, when fewer than 70 % of graded tasks pass every skill-on
  run, or when more than 25 % ended in agent errors. Override with
  `EVAL_GATE_MIN_PASS_PCT` and `EVAL_GATE_MAX_ERROR_PCT`.
- `scripts/eval-diff.sh <old.jsonl> <new.jsonl>` lists tasks whose verdict or
  skill-on pass rate changed.
- `scripts/eval-plan.sh` picks tasks (`EVAL_TASKS`, `EVAL_CHANGED_FILES`,
  `EVAL_MAX_TASKS`) and splits them into `EVAL_SHARDS` shards for CI.
- `evals/runner/selftest.sh` drives all of the above with
  [`runner/fake-agent.sh`](runner/fake-agent.sh) instead of a model. It runs on
  every push, so a runner change that would turn a broken eval green fails first.

### Model evals in CI (`evals.yml`)

| Trigger | Tasks | Activation | Baseline PR |
| ------- | ----- | ---------- | ----------- |
| Monthly schedule (1st, 06:00 UTC) | all, 3 repeats | yes | yes |
| PR labeled `run-evals` | tasks whose folder changed or that load a changed skill | no | no |
| Manual dispatch | `agent`, `tasks`, `repeats`, `max_tasks`, `shards`, `model` inputs | `activation` input | `baseline` input |

The default agent is OpenCode with a free model, so the workflow needs no
secret. `agent=claude` on dispatch uses Claude Code and needs the repository
secret `ANTHROPIC_API_KEY`; without it that run fails on purpose.

For baseline PRs, enable *Settings > Actions > General > Allow GitHub Actions to
create and approve pull requests*. Without it, the baseline job fails and the
results stay available as the `eval-results` artifact.

Baselines land in `evals/baselines/<YYYY-MM-DD>.jsonl` through a bot PR. Each
run's summary shows the diff against the newest committed baseline.

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
OpenCode model this costs nothing; a free-model session took about 25 seconds
in testing. With `agent=claude`, CI caps each task session at USD 0.50
(`TASK_MAX_BUDGET_USD`). Use `max_tasks` or `tasks` on dispatch for smaller
runs.

## CI on every push (no model calls)

[`../.github/workflows/validate.yml`](../.github/workflows/validate.yml) also runs:

- `bash scripts/validate-skills.sh` + activation evals in dry mode
- `bash evals/runner/selftest.sh` (eval pipeline with a fake agent)
- ShellCheck on repo shell scripts (see workflow for paths)
- `node --test` in `evals/tools/ast` plus `bash evals/test-graders.sh`
- Markdown lint on all `*.md` files
