# Harbor wiring

[Harbor](https://github.com/harbor-framework/harbor) (from the Terminal-Bench
team) runs agents in containers with `instruction.md` + `tests/test.sh` and a
numerical reward. It natively drives `claude-code` and `codex` agents, which fits
our provider-independence goal, and its deterministic `test.sh` reward maps
cleanly onto our `grade.sh` graders.

`evals/runner/` is the lightweight, Docker-free local path; Harbor is the
containerized, parallel, reproducible path for CI and bigger runs.

## Mapping

Each of our `evals/tasks/<task>/` maps to a Harbor task:

| Harbor file | Comes from |
| ----------- | ---------- |
| `instruction.md` | `evals/tasks/<task>/instruction.md` |
| task workspace | `evals/tasks/<task>/fixture/` |
| `tests/test.sh` | bridge that calls `evals/tasks/<task>/grade.sh` |
| `task.toml` | from [`task.toml.template`](task.toml.template) |

## Generate Harbor tasks

`tests/test-bridge.sh` is a generic bridge: Harbor copies the fixture into the
task workspace, the agent edits it, then Harbor runs `tests/test.sh`, which calls
our grader against that workspace. Point `task.toml`'s `agent` at `claude-code`
or `codex` to keep runs provider-independent.

See [`task.toml.template`](task.toml.template) and
[`tests/test-bridge.sh`](tests/test-bridge.sh). A small generator (TODO) can
materialize one Harbor task dir per `evals/tasks/<task>/`; until then, copy the
template and set `task = "<task-name>"`.
