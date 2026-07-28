# Skill resolution (core trunk vs our library)

How agents pick guidance when **shopware/shopware in-repo skills** exist vs when
they do not (6.5/6.6 branches, plugins, client projects).

## Two sources

| Source | Location | When available |
| ------ | -------- | -------------- |
| **Core in-repo** | `shopware/shopware/.agents/skills/` (`.claude/skills` → symlink) | Trunk since [#17657](https://github.com/shopware/shopware/pull/17657) |
| **This repo** | `ai-skills-shopware/skills/` via `npx skills add` or `sw-dev link` | Any project, any version |

We **mine** core for maintainer-backed rules; we **do not copy** core skill files
into this repo. See [`core-pr-17657-alignment.md`](core-pr-17657-alignment.md).

## Resolution rules

```text
Does the workspace contain shopware/shopware/.agents/skills/ ?
  YES → Core AGENTS.md + core task skills are primary for platform work.
        Our skills = overlay (architecture, security, review learnings, …).
        Defer overlapping topics to core skill names (see alignment doc).
  NO  → Our skills are primary for all Shopware work on that checkout.
```

## Install profiles

Symlink/install into **`.agents/skills/`** (Codex, Cursor) and **`.claude/skills/`**
(Claude Code). Authoritative source remains `ai-skills-shopware/skills/`.

### `full` — plugins, apps, SW 6.5/6.6, non-trunk core

Use when in-repo core skills are **absent**.

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill php-foundation \
  --skill shopware-architecture \
  --skill shopware-security \
  --skill shopware-plugin-development \
  --skill shopware-testing \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  -a claude-code -a codex -a cursor
```

Add `shopware-app-development`, `shopware-core-development`, workflow skills per
[`use-cases/`](../use-cases/).

### `core-overlay` — shopware/shopware trunk

In-repo skills cover `shopware-php-code`, `shopware-phpunit-tests`,
`shopware-pr-hygiene`, etc. Install **delta only**:

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill shopware-architecture \
  --skill shopware-security \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  --skill shopware-pr-review \
  --skill shopware-podman-dev \
  -a claude-code -a codex -a cursor
```

Add `shopware-plugin-development` when editing `custom/plugins` in the monorepo.

### `plugin` — extension work only

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill php-foundation \
  --skill shopware-architecture \
  --skill shopware-security \
  --skill shopware-plugin-development \
  --skill shopware-testing \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  -a claude-code -a codex -a cursor
```

## Core skill → our owner (defer when present)

| Core (`.agents/skills/`) | Defer static rules to core | Our additive owner |
| ------------------------ | -------------------------- | ------------------- |
| `shopware-php-code` | hexagonal, migrations, deprecations | `shopware-architecture` (decisions), evals |
| `shopware-phpunit-tests` | test shape, flags, providers | `shopware-testing` (plugin patterns), evals |
| `shopware-pr-hygiene` | PR template, follow-up commits | `shopware-pr-description` (copy-paste template) |
| `shopware-change-scope` | boyscouting, root cause | `shopware-review-learnings` (delta findings) |
| `shopware-release-docs` | RELEASE_INFO / UPGRADE | `shopware-core-development` (baseline guardrails) |
| `shopware-admin-js` | Admin JS (trunk only) | not in our repo yet |

**Always ours (no core equivalent):** `shopware-security`, `shopware-architecture`
(decision layer), `shopware-plugin-development`, `shopware-app-development`,
`shopware-review-learnings`, eval tasks.

## sw-dev link

`sw-dev link` symlinks this repo's `skills/` into `.agents/skills/` and
`.claude/skills/`. For trunk instances, configure `instances.json` skills list
to match `core-overlay` or `full` per lane.

## Sync ritual

When core trunk skills change:

1. Diff `shopware/shopware/.agents/skills/` against [`core-pr-17657-alignment.md`](core-pr-17657-alignment.md).
2. Update defer pointers in our skills — do not import core files.
3. Re-run `bash scripts/validate-skills.sh` and `bash evals/test-graders.sh`.
