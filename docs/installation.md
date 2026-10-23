# Installation

The skills install with [`skills.sh`](https://github.com/vercel-labs/skills),
which needs Node.js for `npx`. One source folder per skill works unchanged in
Claude Code, Cursor, Codex, OpenCode and any other tool that reads the Agent
Skills standard.

## Pick a use-case

Install the skills for the work you do, so the context stays lean. Each page
has a ready one-liner:

| You work on | Page |
| ----------- | ---- |
| Plugins and shop projects (most people) | [`use-cases/plugin-development.md`](../use-cases/plugin-development.md) |
| Apps (`manifest.xml`, app scripts, webhooks) | [`use-cases/app-development.md`](../use-cases/app-development.md) |
| `shopware/shopware` itself | [`use-cases/core-development.md`](../use-cases/core-development.md) |
| Storefront and Administration, next to a PHP use-case | [`use-cases/storefront-development.md`](../use-cases/storefront-development.md) |
| Reviewing plugins and apps | [`use-cases/extension-review.md`](../use-cases/extension-review.md) |

Every set includes `sw-skill-router` and `sw-help`. Not sure what you need?
Install those two first: `/sw-help` explains every skill, and
`/sw-skill-router` tells you which ones a change needs and prints the
install command for any that are missing.

The plugin set as an example:

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill sw-skill-router \
  --skill sw-help \
  --skill sw-php-foundation \
  --skill sw-architecture \
  --skill sw-security \
  --skill sw-plugin-development \
  --skill sw-testing \
  --skill sw-research-and-escalation \
  --skill sw-review-learnings \
  --skill sw-change-impact \
  -a claude-code -a codex -a cursor
```

The tool is the `-a` target. Repeat it for each tool you use:

| Tool | Target |
| ---- | ------ |
| Claude Code | `-a claude-code` |
| Cursor | `-a cursor` |
| Codex | `-a codex` |
| OpenCode | `-a opencode` |

Sets can be combined. The surface skills for core, plugin and app are not
exclusive at install time: their descriptions key on the files you edit, so in
a monorepo `src/Core` gets the platform rules and `custom/plugins` gets the
plugin rules.

## Install per project, pin a version

Install into the project (the default, no `-g`). Skills are tuned to a
Shopware version and surface, so a per-project install stays the same for the
whole team and never fires on an unrelated repository. `-g` installs for every
project and leaves the rules effectively unpinned.

Pin a release tag for reproducible installs:

```bash
npx skills add BrocksiNet/ai-skills-shopware@v0.14.0 --skill sw-php-foundation -a cursor
```

## Update

```bash
npx skills update                 # update installed skills to the latest release
./scripts/check-update.sh         # is a newer tag out? prints the command to run
```

`check-update.sh` needs Node 24 and uses `GH_TOKEN` or `GITHUB_TOKEN` when
set.

## The `sw-` rename

Since v0.14.0, every skill starts with `sw-`: `php-foundation` became
`sw-php-foundation`, and `shopware-<topic>` became `sw-<topic>`. Remove the
old folders and install the new names:

```bash
npx skills remove php-foundation shopware-plugin-development   # and the others you had
npx skills add BrocksiNet/ai-skills-shopware --skill sw-php-foundation --skill sw-plugin-development
```

## Where skills load

A skill is a folder with a `SKILL.md` whose `name` matches the folder. Each
tool reads its own folders:

| Tool | Folders |
| ---- | ------- |
| Claude Code | `.claude/skills/`, `~/.claude/skills/` |
| Cursor | `.cursor/skills/`, `.agents/skills/`, `~/.cursor/skills/`, `~/.agents/skills/`, plus legacy `.claude/skills/` and `.codex/skills/` |
| Codex | `.codex/skills/`, `~/.codex/skills/` |
| OpenCode | `.opencode/skills/`, `~/.config/opencode/skills/`, plus the shared `.agents/skills/` and `.claude/skills/` |

`skills.sh` writes into the right folder for each `-a` target. By default it
symlinks, so one `npx skills update` reaches every tool. Use `--copy` for real
copies, for example to commit the skills into a repository.

In a `shopware/shopware` checkout that ships its own `.agents/skills/`, core's
skills lead for platform work and ours are an overlay. See
[`skill-resolution.md`](skill-resolution.md).

## Related tools

- Shopware CLI skills for project and extension workflows:
  `npx skills add shopware/shopware-cli`.
- How this library fits next to the shopware-ai-coding-tools MCP servers:
  [`tooling-stack.md`](tooling-stack.md).
- Trying the skills on a real local shop: [`local-validation.md`](local-validation.md).
