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

Add `sw-app-development`, `sw-core-development`, workflow skills per
[`use-cases/`](../use-cases/).

### `core-overlay` — shopware/shopware trunk

In-repo skills cover `shopware-php-code`, `shopware-phpunit-tests`,
`shopware-pr-hygiene`, etc. Install **delta only**:

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill sw-architecture \
  --skill sw-security \
  --skill sw-research-and-escalation \
  --skill sw-review-learnings \
  --skill sw-change-impact \
  --skill sw-pr-review \
  --skill sw-podman-dev \
  --skill sw-storefront \
  -a claude-code -a codex -a cursor
```

Do **not** `npx skills add --skill sw-admin-js` into a trunk `.agents/skills/`
tree. Core already owns that name. Cursor/Codex overlay is fine.

Add `sw-plugin-development` when editing `custom/plugins` in the monorepo.

### `plugin` — extension work only

```bash
npx skills add BrocksiNet/ai-skills-shopware \
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

## Core skill → our owner (defer when present)

| Core (`.agents/skills/`) | Defer static rules to core | Our additive owner |
| ------------------------ | -------------------------- | ------------------- |
| `shopware-php-code` | hexagonal, migrations, deprecations | `sw-architecture` (decisions), evals |
| `shopware-phpunit-tests` | test shape, flags, providers | `sw-testing` (plugin patterns), evals |
| `shopware-pr-hygiene` | PR template, follow-up commits | `sw-pr-description` (copy-paste template) |
| `shopware-change-scope` | boyscouting, root cause | `sw-review-learnings` (delta findings) |
| `shopware-release-docs` | RELEASE_INFO / UPGRADE | `sw-core-development` (baseline guardrails) |
| `sw-admin-js` | Admin JS (trunk only) | `sw-admin-js` (plugin/project + Meteor / MWG gate) |

**Always ours (no core equivalent):** `sw-security`, `sw-architecture`
(decision layer), `sw-plugin-development`, `sw-app-development`,
`sw-storefront`, `sw-review-learnings`, `sw-change-impact`,
eval tasks.

`sw-admin-js` on trunk: keep core's tracked
`.agents/skills/sw-admin-js/` (including `agents/openai.yaml`). Overlay
our richer skill into `.cursor/skills/` and `.codex/skills/` only. Core's
`.claude/skills` is a git symlink to `.agents/skills` — do not replace it.

## sw-dev link

`sw-dev link` overlays this repo's `skills/` into `.cursor/skills/` and
`.codex/skills/`. It overlays into `.agents/skills/` only when that skill name
is **not already git-tracked**. Skip `.claude/skills` when it aliases
`.agents/skills` (trunk / 6.7 / 6.8). Replacing a tracked core skill with a
symlink shows up as a deletion in `git status` (`SKILL.md`, `openai.yaml`) and
must not be committed.

For trunk instances, configure `instances.json` to the `core-overlay` preset.
`sw-storefront` has no core equivalent, so it is safe on every provider.

## Sync ritual

When core trunk skills change:

1. Diff `shopware/shopware/.agents/skills/` against [`core-pr-17657-alignment.md`](core-pr-17657-alignment.md).
2. Update defer pointers in our skills — do not import core files.
3. Re-run `bash scripts/validate-skills.sh` and `bash evals/test-graders.sh`.
