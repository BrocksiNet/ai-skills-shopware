# Eval suite

Proof that the skills change the model's output, not just that they exist. Three
layers, cheapest to most expensive.

## Layer 1 — activation (`../scripts/run-activation-evals.sh`)

Sends each skill's `evals/should-trigger.md` / `should-not-trigger.md` prompts to
an agent and checks the right skill loads (and the wrong ones stay quiet). Cheap;
runs on every PR via CI in `--dry` mode (file presence + prompt parsing) and for
real when an agent command is configured.

## Layer 2 — behavioral (`tasks/`)

Each `tasks/<rule>/` is a fixture task:

```
tasks/<rule>/
├── instruction.md     # the prompt given to the agent
├── fixture/           # starting code copied into the agent's working dir
└── grade.sh           # deterministic grader (exit 0 = pass)
```

`grade.sh` contract (env provided by the runner):

- `WORKDIR` — directory with the agent's resulting files (fixture + edits).
- `TRANSCRIPT` — path to a file containing the agent's textual output.

Graders prefer deterministic Shopware tooling (PHPStan/ECS/PHPUnit) and
grep/AST checks over LLM-as-judge. LLM-judge is a documented fallback for fuzzy
rules only.

## Layer 3 — A/B ablation (`runner/`)

- `runner/run-task.sh <task> <on|off>` — copy the fixture into a temp workdir,
  invoke the agent with the skill profile enabled (`on`) or disabled (`off`),
  capture the transcript, then run `grade.sh`.
- `runner/ab.sh <task>` — run both, compare pass/fail. A skill that does not move
  the result is not earning its context budget.

The agent is provided via `SKILLS_AGENT_CMD` (reads the prompt on stdin, works in
the current directory, prints its transcript to stdout). Skill on/off is provided
by `SKILLS_PROFILE_ON_CMD` / `SKILLS_PROFILE_OFF_CMD` hooks (install/uninstall or
enable/disable the profile for the target tool) — leave unset to A/B manually.

## Harbor (`harbor/`)

For containerized, parallel, multi-agent runs, [`harbor/`](harbor/README.md)
wires the same tasks into [Harbor](https://github.com/harbor-framework/harbor)
(`claude-code` / `codex` agents, `instruction.md` + `tests/test.sh`).

## Cost note

Layers 2-3 call real models and cost money. They run in CI only behind a label or
schedule with an API-key secret (see `../.github/workflows/evals.yml`), never on
every push.
