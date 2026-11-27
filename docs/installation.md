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

`check-update.sh` needs Node 26 and uses `GH_TOKEN` or `GITHUB_TOKEN` when
set.

## Claude Code plugin

In Claude Code you can also install every skill at once as the
`shopware-skills` plugin. This repo is its own plugin marketplace:

```bash
claude plugin install shopware-skills --marketplace BrocksiNet/ai-skills-shopware --scope project
```

Inside a session, `/plugin install shopware-skills --marketplace
BrocksiNet/ai-skills-shopware` does the same. Use `--scope project` to share
the plugin with your team through `.claude/settings.json`, or leave it out to
install it for yourself only.

The plugin follows releases, not `main`: it moves to a new version only when
a release bumps it. To get the latest one:

```bash
claude plugin marketplace update ai-skills-shopware
claude plugin update shopware-skills@ai-skills-shopware
```

Plugin skills carry the plugin name, for example
`/shopware-skills:sw-help`. The plugin always installs all skills; to pick
single skills or to use another agent, install with `npx skills add` as
above.

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

## Automatic routing hook (Claude Code)

Agents often forget to invoke skills on their own. In Claude Code, wire
`route.mjs --hook` as a `UserPromptSubmit` hook (and optionally `PostToolUse`
on `Edit|Write`) so the matched skills, references, and active rule IDs arrive
automatically whenever the diff changes — and print nothing when the matched
set has not changed (state is stored in `git rev-parse --git-dir`, so worktrees
stay isolated):

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/skills/sw-skill-router/scripts/route.mjs --hook --task build"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/skills/sw-skill-router/scripts/route.mjs --hook --task build"
          }
        ]
      }
    ]
  }
}
```

### Slimming the skill listing with `skillOverrides`

**Only pair `"name-only"` with the routing hook above — never enable it
standalone.** Without the hook, hiding descriptions makes models skip skills
silently. With the hook active, `sw-skill-router` and `sw-help` keep full
descriptions while the remaining `sw-*` skills drop to name-only in the
always-on listing:

```json
{
  "skillOverrides": {
    "sw-php-foundation": { "visibility": "name-only" },
    "sw-architecture": { "visibility": "name-only" },
    "sw-security": { "visibility": "name-only" },
    "sw-plugin-development": { "visibility": "name-only" },
    "sw-testing": { "visibility": "name-only" },
    "sw-research-and-escalation": { "visibility": "name-only" },
    "sw-review-learnings": { "visibility": "name-only" },
    "sw-change-impact": { "visibility": "name-only" }
  }
}
```

Use `route.mjs --brief --task build` to preview the exact compact pointer list
the hook injects. Codex and Cursor do not share this hook/override format yet,
so keep full descriptions there.

### Isolating review skills (`context: fork`)

In Claude Code, self-contained review skills that read `git diff` or `gh`
directly (`sw-extension-review` and `sw-pr-review`) can run in a forked
subagent (`context: fork`) so their full borrowed references never bloat the
main build conversation. Never enable `context: fork` on interactive build
skills or when the diff exists only in chat history, because a forked subagent
does not see prior conversation messages.

## Related tools

- Shopware CLI skills for project and extension workflows:
  `npx skills add shopware/shopware-cli`.
- Google Chrome's Modern Web Guidance, the default companion for frontend
  work (generic CSS, HTML, JS, Core Web Vitals, a11y). Install only this
  skill, not `chrome-extensions`:
  `npx skills add GoogleChrome/modern-web-guidance --skill modern-web-guidance`.
  Shopware components win when both apply; see
  [`storefront-development.md`](../use-cases/storefront-development.md#default-companion-modern-web-guidance).
- How this library fits next to the shopware-ai-coding-tools MCP servers:
  [`tooling-stack.md`](tooling-stack.md).
- Trying the skills on a real local shop: [`local-validation.md`](local-validation.md).
