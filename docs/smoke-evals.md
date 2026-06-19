# Local smoke evals

Run behavioral eval tasks **with skills ON vs OFF** and compare whether the
linked skills change the outcome. Uses deterministic `grade.sh` graders (no
LLM-as-judge).

## Quick start

```bash
cd /path/to/ai-skills-shopware

cp evals/smoke/smoke.env.example evals/smoke/smoke.env   # optional tweaks

chmod +x evals/smoke/smoke.sh evals/smoke/lib/*.sh evals/test-graders.sh evals/tasks/*/grade.sh

# No model calls — check graders + agent availability
./evals/smoke/smoke.sh agents
./evals/smoke/smoke.sh graders

# Single run (costs API tokens)
./evals/smoke/smoke.sh run --agent claude --task no-empty-explicit --mode on
./evals/smoke/smoke.sh ab   --agent claude --task no-empty-explicit

# Default suite: A/B for each task × each available agent
./evals/smoke/smoke.sh suite
./evals/smoke/smoke.sh suite --agent claude --task backed-enum-over-constants
```

## Agents

| Agent | CLI | Auth |
| ----- | --- | ---- |
| `claude` | `claude` (Claude Code) | `ANTHROPIC_API_KEY` or `claude auth login` |
| `codex` | `codex` | `OPENAI_API_KEY` or `codex login` |
| `cursor` | `agent` (or `cursor-agent`) | Local: `agent login` (browser). CI: CLI-capable user/service key as `CURSOR_API_KEY`. Admin `crsr_` keys are ignored. |

Override commands in `evals/smoke/smoke.env`:

```bash
SMOKE_CLAUDE_CMD='claude -p --dangerously-skip-permissions --output-format text'
SMOKE_CODEX_CMD='codex exec --dangerously-bypass-approvals-and-sandbox -s workspace-write'
SMOKE_CURSOR_CMD='cursor-agent -p --force --output-format text'
```

## Skills ON vs OFF

For each task, the runner creates a temp workdir, copies the fixture, then:

- **ON** — symlinks `SMOKE_SKILLS` into `.claude/skills/`, `.codex/skills/`,
  `.cursor/skills/`, and `.agents/skills/` inside the workdir.
- **OFF** — removes those directories so the agent sees no project skills.

Default skills: `php-foundation`, `shopware-testing`, `shopware-review-learnings`.

Some tasks load extra skills via `evals/tasks/<task>/skills`:

| Task | Extra skills beyond default |
| ---- | --------------------------- |
| `cache-tag-no-deprecated-event` | `shopware-plugin-development` |
| `interface-di-repository` | `shopware-core-development` |
| `phpstan-baseline-guardrail` | `shopware-core-development` |
| `core-http-client-behind-flag` | `shopware-core-development` |

Tasks without a `skills` file use the default `SMOKE_SKILLS` only.

## Default smoke tasks

| Task | Skill under test |
| ---- | ---------------- |
| `no-empty-explicit` | `php-foundation` — no `empty()` |
| `backed-enum-over-constants` | `php-foundation` — backed enum |
| `unit-test-passes` | `shopware-testing` — unit test shape |
| `clock-interface-injection` | `php-foundation` — PSR-20 clock, no `time()` |
| `unit-test-exception-object` | `shopware-testing` — `expectExceptionObject`, no message matcher |
| `interface-di-repository` | `php-foundation` + core — repository interface, not concrete DAL |
| `cache-tag-no-deprecated-event` | plugin dev — `CacheTagCollector`, not `*CacheTagsEvent` |
| `phpstan-baseline-guardrail` | core dev — level + baseline regenerated together |
| `core-http-client-behind-flag` | core dev — Symfony HttpClient behind `Feature::isActive`, legacy path kept |

Other eval tasks (not in default suite): `no-contradiction-full-profile`.

## CI (later)

Set provider keys and `SMOKE_CI=1`. Agents without auth are skipped; the job
fails if **zero** agents run.

```yaml
env:
  ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  SMOKE_CI: "1"
run: bash evals/smoke/smoke.sh suite --agent claude
```

Start local-first; wire a scheduled workflow once keys and cost limits are agreed.

## Debug

```bash
SMOKE_KEEP_WORKDIR=1 ./evals/smoke/smoke.sh run --agent claude --task no-empty-explicit --mode on
# inspect printed workdir path + .transcript.txt
```

If Claude prints a model-unavailable error, retry later or set a working model in Claude Code settings.

## Relation to `evals/runner/`

- `evals/runner/run-task.sh` — generic; set `SKILLS_AGENT_CMD` yourself.
- `evals/smoke/smoke.sh` — batteries-included wrappers for Claude/Codex/Cursor,
  skill symlinks, and A/B reporting.

Harbor (`evals/harbor/`) remains the containerized path for large parallel runs.
