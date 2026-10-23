---
name: sw-skill-router
description: >-
  Pick the Shopware skills and references a change or a task needs, instead of
  guessing. Use at the start of Shopware work, before reviewing a Shopware
  pull request or diff, when a plan lists the files it will touch, or when the
  user asks "which skill should I use", "which skills apply to this PR" or
  "route this change". Runs a script that reads the git diff or planned paths,
  detects core, plugin, app or project, and lists what to load and why. Do NOT
  use to explain what the library offers (sw-help) or as a replacement for
  reading the skills it names.
license: MIT
metadata:
  contexts: core plugin app project
  tasks: build review ship answer run
---

# Skill router

Agents skip skills they do not think of. This skill turns "which skill?" into
a command: it matches the change against every skill's routes and prints what
to load, with the file or line that triggered each one.

## Run it

The script sits next to this file, in `scripts/route.mjs`. Run it from the
repository the user works in, with the folder this `SKILL.md` lives in:

```bash
node <this-skill-folder>/scripts/route.mjs --task build
```

Pick the input:

| Situation | Command |
| --------- | ------- |
| Work on a branch, committed or not | `route.mjs --task build` (diff against `origin/trunk` or `origin/main`, plus untracked files) |
| Another base branch | `route.mjs --base origin/6.6.x --task review` |
| A saved pull request diff | `gh pr diff 123 \| node route.mjs --diff - --task review` |
| Nothing written yet | write the plan first, then `route.mjs --paths <every file the plan touches> --task build` |
| A question with no files | `route.mjs --task answer` lists the skills that fit |
| See every skill | `route.mjs --list` |

Pick `--task` from what the user asked for:

| Task | The user wants to |
| ---- | ----------------- |
| `build` | write or change code |
| `review` | review a diff or a pull request, or answer review comments |
| `ship` | commit, open a pull request, write the PR body or release notes |
| `answer` | understand something, research a question, reply to a ticket |
| `run` | run tests, linters or the dev environment |

`--context core|plugin|app|project` overrides the detected repository kind.
`--json` prints the same result for a script.

## Act on the output

1. Read the `SKILL.md` of every skill under **Load these skills**, then each
   reference listed under it. The paths are the installed files. Skills and
   references come most-matched first.
2. When a skill says **core leads here**, read that core skill in
   `.agents/skills/` first and treat ours as the overlay.
3. Read an **on demand** reference only when its "when" matches the task.
4. **Also fits** lists skills no file selected. Load one only when the
   request is about its topic.
5. **Recommended but not installed** prints the install command. Tell the
   user; do not install skills without asking.
6. Tell the user in one line which skills you loaded and why, then do the
   work.

The header names the base branch, the merge base and how many commits the
branch has. A note about many changed files usually means a stale base:
run `git fetch`, or pass `--base` or `--diff`.

Run it again when the plan changes or new files join the change. An empty
**Load** section on a fresh branch is normal: plan the files, then route
them with `--paths`.

## Contexts

The script detects the repository kind from the root:

| Context | Detected by |
| ------- | ----------- |
| core | `composer.json` name `shopware/shopware`, or `src/Core/Kernel.php` |
| plugin | `composer.json` type `shopware-platform-plugin` |
| app | `manifest.xml` at the root |
| project | requires `shopware/core`, has `custom/plugins` or `.shopware-project.yml` |

In a project, files under `custom/plugins/<name>/` count as plugin and
files under `custom/apps/<name>/` as app, so one diff can hold several
contexts. A skill for another context is listed under **Matched files but
skipped**. In a core checkout with its own `.agents/skills`, the core skills
lead for platform work and the `sw-` skills are an overlay.
