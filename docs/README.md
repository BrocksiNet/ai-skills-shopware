# Documentation

Start with the [README](../README.md) for what the library is and how to
install it. The pages here go deeper, grouped by what you want to do.

## Using the skills

| Page | What it covers |
| ---- | -------------- |
| [Installation](using/installation.md) | Install, pin, update, the `sw-` rename, where each tool loads skills, the routing hook |
| [Skill preferences](using/skill-preferences.md) | Personal settings for a skill, kept outside the repository |
| [Skill resolution](using/skill-resolution.md) | Core trunk's own skills next to ours, and which one leads |
| [Tooling stack](using/tooling-stack.md) | Skills, Shopware CLI and MCP servers, and when to use which |
| [Local validation](using/local-validation.md) | Try the skills on your own shop and send feedback |

## Contributing

| Page | What it covers |
| ---- | -------------- |
| [Architecture](contributing/architecture.md) | The parts, how an agent finds a rule, how a rule is proven, version facts |
| [Smoke evals](contributing/smoke-evals.md) | Local A/B harness for Claude, Codex and Cursor |
| [Testing quality](contributing/testing-quality.md) | Coverage, targeted mutation checks and runtime contracts of the tooling |
| [`AGENTS.md`](../AGENTS.md) | Repository layout, checks, adding rules, references and skills |
| [`evals/README.md`](../evals/README.md) | Writing and running eval tasks |

## Maintaining

| Page | What it covers |
| ---- | -------------- |
| [Staying current](maintaining/README.md) | The automation that keeps rules current, its sources, how a change lands |
| [Drift and review signals](maintaining/drift-and-reviews.md) | Reading the drift issue and review comments, replaying the router |
| [Suggesting rules](maintaining/suggesting-rules.md) | Rule proposals, drafting one as a pull request, the CI workflow |
| [Releasing](maintaining/releasing.md) | Cutting a release and writing the changelog entry |
| [Core skill alignment](maintaining/core-pr-17657-alignment.md) | Rule checklist mined from core trunk skills, the core PR watchlist |

## Results

| Page | What it covers |
| ---- | -------------- |
| [Results](results/README.md) | What the A/B runs showed, including where the skills did not help |
| [Evidence archive](results/evidence.md) | Archived raw records, how to download and verify them, how to add more |
| [November 4, 2026](results/2026-11-04/experiments.md) | That experiment batch in full, with the [skill maintenance report](results/2026-11-04/skill-maintenance.md) |

## Plans

[`plans/`](plans/README.md) holds active plans and sub-agent handoffs;
finished ones move to `plans/done/`.

`.mining-state.json` is not a page: drift mining records there how far it
has read each source.
