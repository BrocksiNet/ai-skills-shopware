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
- **Organised by surface, not persona.** Skills key on *what you are editing* —
  the platform (`src/Core`), a plugin/project (`custom/plugins`), or an app
  (`custom/apps`). The right one activates from the path/context, so context
  stays lean and a monorepo that spans surfaces just works.
- **Proven, not assumed.** Every rule ships with evals so we can show it changes
  the model's output (see [Validating skills](#validating-skills)).

## Skill index

| Skill | Surface | Purpose |
| ----- | ------- | ------- |
| [`php-foundation`](skills/php-foundation/SKILL.md) | any PHP | Strict PHP 8.x base: `strict_types`, enums/DTOs over arrays, PER-CS, `list<>` over `array<>`. |
| [`shopware-core-development`](skills/shopware-core-development/SKILL.md) | platform (`shopware/shopware`, `src/`) | Strict rules for changing the platform: deprecation policy, release notes (RELEASE_INFO/UPGRADE) + ADRs, PHPStan baseline discipline, `@internal` boundaries. |
| [`shopware-plugin-development`](skills/shopware-plugin-development/SKILL.md) | plugin / project (`custom/plugins`) | Pragmatic PHP-extension rules: smallest safe change, 6.6/6.7 compat, DAL usage, HTTP cache tags (6.7+), migrations, decoration. |
| [`shopware-app-development`](skills/shopware-app-development/SKILL.md) | app (`custom/apps`, `manifest.xml`) | Declarative app rules: manifest, least-privilege permissions, sandboxed Twig app scripts, webhooks + Admin API, Meteor Admin SDK. |
| [`shopware-testing`](skills/shopware-testing/SKILL.md) | any test | PHPUnit standards: unit vs integration placement, `IntegrationTestBehaviour`, data providers, no real I/O in unit tests. |
| [`shopware-review-learnings`](skills/shopware-review-learnings/SKILL.md) | any review | Recurring findings from real plugin/app/PR reviews. Grows over time. |
| [`shopware-research-and-escalation`](skills/shopware-research-and-escalation/SKILL.md) | any | When to research vs. proceed, the Shopware docs map, Context7 for libraries, and the when-stuck ladder. |
| [`shopware-pr-description`](skills/shopware-pr-description/SKILL.md) | core PR workflow | GitHub PR body template for `shopware/shopware` contributions (copy-paste ready). |
| [`shopware-assistant-style`](skills/shopware-assistant-style/SKILL.md) | any communication | Plain, concise answers; support-ticket replies in one copy block. |
| [`shopware-pr-review`](skills/shopware-pr-review/SKILL.md) | PR review | Triage GitHub review threads; fix, reply, or push back with confidence. |
| [`shopware-podman-dev`](skills/shopware-podman-dev/SKILL.md) | linked Podman checkout | **Optional.** Never host php/composer/phpunit — MCP or `podman compose exec web`; for `~/shopware-dev` + Mutagen setups. |

See [`docs/tooling-stack.md`](docs/tooling-stack.md) for how this repo fits with
shopware-ai-coding-tools and a multi-instance proxy setup.

See [`REGISTRY.md`](REGISTRY.md) for the full catalog with ownership and the
topic → owning-skill coverage matrix that keeps skills from contradicting each
other.

## Install

Requires Node.js (for `npx`). There is no single "install everything" command on
purpose: you install the skills for the use-case you are working on, so the
context stays lean. The surface skills (`core` / `plugin` / `app`) are **not**
install-time exclusive: they disambiguate on the target you are editing, so only
the right one activates per task. Installing several use-case sets together is
safe; in a monorepo, editing `src/Core` fires the platform rules while editing
`custom/plugins` fires the plugin rules.

Canonical one-liners live in [`use-cases/`](use-cases/):
[`plugin-development.md`](use-cases/plugin-development.md),
[`app-development.md`](use-cases/app-development.md), and
[`core-development.md`](use-cases/core-development.md).

Each use-case below lists one ready-to-copy command per supported tool. The only
difference between tools is the `-a` target.

### Plugin / project development (most people)

#### Cursor

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill php-foundation \
  --skill shopware-plugin-development \
  --skill shopware-testing \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  -a cursor
```

#### Claude Code

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill php-foundation \
  --skill shopware-plugin-development \
  --skill shopware-testing \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  -a claude-code
```

#### Codex

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill php-foundation \
  --skill shopware-plugin-development \
  --skill shopware-testing \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  -a codex
```

#### OpenCode

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill php-foundation \
  --skill shopware-plugin-development \
  --skill shopware-testing \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  -a opencode
```

### App development

#### Cursor

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill php-foundation \
  --skill shopware-app-development \
  --skill shopware-testing \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  -a cursor
```

#### Claude Code

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill php-foundation \
  --skill shopware-app-development \
  --skill shopware-testing \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  -a claude-code
```

#### Codex

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill php-foundation \
  --skill shopware-app-development \
  --skill shopware-testing \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  -a codex
```

#### OpenCode

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill php-foundation \
  --skill shopware-app-development \
  --skill shopware-testing \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  -a opencode
```

### Shopware platform / core contribution

#### Cursor

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill php-foundation \
  --skill shopware-core-development \
  --skill shopware-testing \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  -a cursor
```

#### Claude Code

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill php-foundation \
  --skill shopware-core-development \
  --skill shopware-testing \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  -a claude-code
```

#### Codex

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill php-foundation \
  --skill shopware-core-development \
  --skill shopware-testing \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  -a codex
```

#### OpenCode

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill php-foundation \
  --skill shopware-core-development \
  --skill shopware-testing \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  -a opencode
```

Building across more than one use-case (e.g. a monorepo with platform and
extensions)? Add each use-case's surface skill: the surface routing keeps strict
and pragmatic rules from firing on the wrong code.

### Prefer a project-level install

Install into the **current project** (the default — no `-g`), not user-level.
Skills are pinned per release and tuned to a project's Shopware version and
surface, so a per-project install stays reproducible for the whole team and
never fires stale or version-mismatched rules on an unrelated repo. The `-g`
flag installs user-level (all projects), but the rules are then global and
effectively unpinned — only reach for it if you work on Shopware almost
exclusively and accept that trade-off.

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
[`docs/local-validation.md`](docs/local-validation.md): install the skills for
your use-case, point them at your own local Shopware, run a task, verify with the
project's own tooling, and send feedback.

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

Ownership: the `shopware-core-development` skill is platform/maintainer-controlled.
Propose changes via PR; recurring real-world findings go through the
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
