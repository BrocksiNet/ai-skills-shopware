# ai-skills-shopware

Provider-independent [Agent Skills](https://code.claude.com/docs/en/skills) for
Shopware 6 development. One `SKILL.md` source of truth that works unchanged in
**Cursor**, **Claude Code**, **Codex**, and **OpenCode** (and any other tool that
implements the open Agent Skills standard).

This repository is the central, team-controlled library. You install the skills
into your IDE with [`skills.sh`](https://github.com/vercel-labs/skills), pin to a
release tag, and run `npx skills update` to pull improvements.

> Status: early. The skill set starts small and high-value on purpose (see
> [curation](#curation--governance)) and grows from real review findings.

## Why this exists

- **One source of truth.** Stop copying rules between `.cursor/`, `~/.claude/skills/`,
  and `~/.codex/skills/`. Author once, project everywhere.
- **No per-provider drift.** The same skill behaves the same in every tool.
- **Profiles, not a mega-prompt.** Install the *core* or *plugin* profile per
  project so context stays lean and rules stay relevant.
- **Proven, not assumed.** Every rule ships with evals so we can show it changes
  the model's output (see [Validating skills](#validating-skills)).

## Skill index

| Skill | Profile | Purpose |
| ----- | ------- | ------- |
| [`php-foundation`](skills/php-foundation/SKILL.md) | shared | Strict PHP 8.x base: `strict_types`, enums/DTOs over arrays, PER-CS, `list<>` over `array<>`. |
| [`shopware-core-development`](skills/shopware-core-development/SKILL.md) | core | Strict rules for contributing to `shopware/shopware`: deprecation policy, release notes (RELEASE_INFO/UPGRADE) + ADRs, PHPStan baseline discipline, `@internal` boundaries. |
| [`shopware-plugin-development`](skills/shopware-plugin-development/SKILL.md) | plugin | Pragmatic plugin/app rules: smallest safe change, 6.6/6.7 compat, DAL usage, HTTP cache tags (6.7+), migrations, decoration. |
| [`shopware-testing`](skills/shopware-testing/SKILL.md) | both | PHPUnit standards: unit vs integration placement, `IntegrationTestBehaviour`, data providers, no real I/O in unit tests. |
| [`shopware-review-learnings`](skills/shopware-review-learnings/SKILL.md) | both | Recurring findings from real plugin/app/PR reviews. Grows over time. |
| [`shopware-research-and-escalation`](skills/shopware-research-and-escalation/SKILL.md) | both | When to research vs. proceed, the Shopware docs map, Context7 for libraries, and the when-stuck ladder. |

See [`REGISTRY.md`](REGISTRY.md) for the full catalog with ownership and the
topic → owning-skill coverage matrix that keeps skills from contradicting each
other.

## Install

Requires Node.js (for `npx`). Pick a **profile** and install it into your tool.
The two profiles are install-time exclusive: a given project uses *core* or
*plugin*, never both, so strict and pragmatic rules never load together.

### Plugin / app development (most people)

```bash
# Cursor
npx skills add BrocksiNet/ai-skills-shopware \
  --skill php-foundation \
  --skill shopware-plugin-development \
  --skill shopware-testing \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  -a cursor

# Claude Code  ->  -a claude-code
# Codex        ->  -a codex
# OpenCode     ->  -a opencode
```

### Shopware core contribution

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill php-foundation \
  --skill shopware-core-development \
  --skill shopware-testing \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  -a cursor
```

Use `-g` to install into the user-level directory (all projects) instead of the
current project. See [`profiles/core.md`](profiles/core.md) and
[`profiles/plugin.md`](profiles/plugin.md) for the canonical one-liners.

### Pin a version

```bash
# Pin to a release tag for reproducibility
npx skills add BrocksiNet/ai-skills-shopware@v0.1.0 --skill php-foundation -a cursor
```

## Update

```bash
npx skills update                 # update installed skills to latest
./scripts/check-update.sh         # report whether a newer release tag exists
```

`check-update.sh` compares your pinned version against the latest GitHub release
tag and prints the exact `npx skills update` command to run.

## Where skills load (per provider)

A skill is a folder containing a `SKILL.md` whose `name` frontmatter matches the
folder name. Each tool discovers them from its own directories:

- **Cursor:** `.cursor/skills/`, `.agents/skills/`, `~/.cursor/skills/`, `~/.agents/skills/` (plus legacy `.claude/skills/`, `.codex/skills/`).
- **Claude Code:** `.claude/skills/`, `~/.claude/skills/`.
- **Codex:** `.codex/skills/`, `~/.codex/skills/`.
- **OpenCode:** `.opencode/skills/`, `~/.config/opencode/skills/`, plus the shared `.agents/skills/` and `.claude/skills/` (project and global).

`skills.sh` handles writing into the right directory for the `-a` target. By
default it **symlinks** the skill into each tool's folder rather than copying, so
there is no manual step and one `npx skills update` reaches every tool at once.
Use `--copy` if you want real file copies (e.g. to commit skills into a repo).
OpenCode enforces a slightly stricter `name` rule (lowercase, single hyphens,
matching the folder); every skill in this repo already complies.

## Validating skills

We do not assume the rules are applied — we test it. Three layers:

1. **Activation (Layer 1):** `scripts/run-activation-evals.sh` runs each skill's
   `evals/should-trigger.md` / `should-not-trigger.md` prompts and checks the
   right skill loads (and the wrong ones stay quiet).
2. **Behavioral (Layer 2):** `evals/tasks/<rule>/` give the agent a real task and
   grade the output with deterministic Shopware tooling (PHPStan/ECS/PHPUnit + grep).
3. **A/B ablation (Layer 3):** `evals/runner/` runs each task with the skill on and
   off and compares pass rates — proof the skill earns its context budget.

For a hands-on, real-instance check, follow
[`docs/local-validation.md`](docs/local-validation.md): install a profile, point
it at your own local Shopware, run a task, verify with the project's own tooling,
and send feedback.

## Curation & governance

This is a curated library, not a dumping ground. A rule is included only if it:

1. **Delta principle** — the base model gets it wrong *for Shopware* (we do not
   re-teach generic PHP/Symfony).
2. **Value/frequency** — maps to a recurring review finding or high-impact area.
3. **Single home** — belongs to exactly one skill (enforced by the coverage matrix).
4. **Testable** — has an eval; if we cannot test it, it is documentation, not a rule.
5. **License-clean** — written in our own words. Upstream is inspiration, not a
   dependency. MIT content may be vendored as a pinned, attributed snapshot;
   CC-BY-SA content is rewritten.

Ownership: the `core` profile is platform/maintainer-controlled. Propose changes
via PR; recurring real-world findings go through the
[issue templates](.github/ISSUE_TEMPLATE) and become review-learnings + eval tasks.

## Credits

Built on the shoulders of (and rewritten from, not copied):
[`shopwareLabs/ai-coding-tools`](https://github.com/shopwareLabs/ai-coding-tools),
[`bartundmett/skills`](https://github.com/bartundmett/skills),
[`biotech-shopware/claude-shopware-skill`](https://github.com/biotech-shopware/claude-shopware-skill),
[`netresearch/php-modernization-skill`](https://github.com/netresearch/php-modernization-skill),
the [LambdaTest PHPUnit skill](https://github.com/LambdaTest/agent-skills),
and Shopware's own [`coding-guidelines`](https://github.com/shopware/shopware/tree/trunk/coding-guidelines).
Authoring follows [Anthropic's skill guide](https://www.anthropic.com/news/skills)
and the [skills.sh](https://github.com/vercel-labs/skills) ecosystem.

## License

[MIT](LICENSE).
