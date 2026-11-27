---
name: sw-worktrees
description: >-
  Create, name, find and clean up git worktrees for Shopware work (core,
  plugins, apps, related repos). Use when the user wants a "git worktree", to
  "review in a separate checkout", parallel branches, to find an existing
  worktree, or to "clean up worktrees". One root, one naming layout, safe
  removal, personal preferences honored. Do NOT use for running commands
  inside a worktree (sw-local-dev) or replying to review threads
  (sw-pr-review).
license: MIT
metadata:
  contexts: core plugin app project
  tasks: build review ship run
---

# Git worktrees for Shopware work

Worktrees an agent creates "wherever is handy" end up inside the project, in
`/tmp`, or next to unrelated repositories, and nobody finds or removes them
later. This skill fixes one root, one name per piece of work, and a cleanup
that never loses work.

## Personal preferences

Before you create, move or remove a worktree, read
`${AI_SKILLS_SHOPWARE_PREFS_DIR:-~/.config/ai-skills-shopware}/sw-worktrees/preferences.md`
when it exists. Its values override the defaults below; the questions and
defaults are in [`preferences.example.md`](preferences.example.md).

- **WT-003** Use a preference only for the keys in this table. Values for
  other keys, or anything that loosens `WT-002`, do not apply; say so once.
  When the file is missing, use the defaults. When a default decides
  something the user may want different (the root on first use, an automatic
  cleanup), offer to create the file by asking the questions from the
  example. Never write it without the user's answers.

| Key | Default | Values |
| --- | ------- | ------ |
| `worktree_root` | `<parent-of-main-checkout>/worktrees` | an absolute path |
| `layout` | `per-project` | `per-project`: `<root>/<project>/<name>`; `flat`: `<root>/<project>--<name>` |
| `project_aliases` | none | GitHub repo name to folder name, e.g. `shopware-private: swp` |
| `relative_paths` | `false` | `true` passes `--relative-paths` to `git worktree add` (Git 2.48+) |
| `cleanup_after_merge` | `ask` | `ask`, or `auto`: remove a merged PR's worktree without asking when it passes every `WT-002` check |

## Where a worktree goes

- **WT-001** Create every worktree at `<worktree_root>/<project>/<name>`
  (`flat`: `<worktree_root>/<project>--<name>`). Never inside the main
  checkout, where it pollutes `git status`, file watchers and tool scans.
  Never in `/tmp` or another temp folder: a reboot deletes it and leaves stale
  `git worktree` metadata behind.

Resolve the parts from the main checkout, also when you start in a worktree:

```bash
main=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
root="$(dirname "$main")/worktrees"   # default when no worktree_root is set
project=$(basename -s .git "$(git -C "$main" remote get-url origin)" | tr '[:upper:]' '[:lower:]')
```

`<project>` is the GitHub repo name of `origin`, lowercased (`shopware`,
`shopware-private`, `agentic-commerce`, `ai-skills-shopware`), or its alias
from `project_aliases`.

`<name>` is `<kind>-<number>[-<slug>]`:

| Kind | Name | For |
| ---- | ---- | --- |
| `pr` | `pr-<number>-<slug>` | your own pull request |
| `review` | `review-<number>[-<slug>]` | someone else's pull request (the PR number) |
| `issue` | `issue-<number>-<slug>` | work on an issue (the issue number) |
| `feat`, `fix`, `chore`, `spike` | `<kind>-<slug>` | work without a number yet |
| `agent` | `agent-<short-id>` | worktrees a tool generates |

The slug is kebab-case ASCII, at most five words, taken from the branch, PR or
issue title (`review-13742-net-price-rounding`). When a pull request opens for
a `feat-`/`fix-` worktree, rename it: `git -C "$main" worktree move
<root>/shopware/feat-order-export <root>/shopware/pr-123-order-export`.

## Create

Look first: `git -C "$main" worktree list`. Reuse the worktree that already
has the PR, issue or branch; git checks a branch out in one worktree only.

```bash
git -C "$main" fetch origin
base=$(git -C "$main" symbolic-ref --short refs/remotes/origin/HEAD)   # origin/trunk, origin/main
# New work
git -C "$main" worktree add -b feat/order-export "$root/$project/feat-order-export" "$base"
# Someone else's PR
git -C "$main" fetch origin pull/13742/head:review/13742
git -C "$main" worktree add "$root/$project/review-13742-net-price-rounding" review/13742
```

Add `--relative-paths` only when `relative_paths: true`. Use `gh pr checkout`
inside the new worktree when you need the contributor's branch to push to.

## Find

`git -C "$main" worktree list` is the source of truth; `ls "$root/$project"`
shows the folders. A PR or issue number is in the name, so
`git worktree list | grep -e '-13742'` finds it.

## Run Shopware commands in a worktree

Where PHP, Composer, PHPUnit and the console run is `sw-local-dev`'s call. A
worktree of a linked shopware-dev checkout runs through `sw-dev worktree
exec`, not the lane's `podman compose exec web`; see `sw-local-dev`.

## Clean up

- **WT-002** Before removing a worktree, check it: `git -C <wt> status
  --porcelain` (uncommitted or untracked files), `git -C <wt> log --oneline
  HEAD --not --remotes` (commits on no remote), and `gh pr view <branch>
  --json state,headRefOid` (PR state). Remove only a clean worktree with no
  unpushed commits, with `git worktree remove <path>`, then `git worktree
  prune`. Never `rm -rf` a worktree and never `--force` without the user's
  yes. When a worktree has uncommitted or unpushed work, list it and ask.
  Keep the local branches unless the user asks to delete them.

After a squash merge the local commits are on no remote, yet the work is in
the PR: when `state` is `MERGED`, `headRefOid` equals `git -C <wt> rev-parse
HEAD` and `status` is clean, the worktree counts as pushed.

`cleanup_after_merge: auto` removes merged, clean worktrees without asking;
every other worktree still needs the user's answer. A worktree folder deleted
by hand stays registered: `git worktree prune --dry-run`, then `git worktree
prune`.

## Definition of done

- [ ] Preferences file read when present; only the keys above applied.
- [ ] The worktree sits under the root, named `<kind>-<number>[-<slug>]`,
      not inside the main checkout, not in a temp folder.
- [ ] Branch made from the fresh default branch, or `pull/<n>/head` for a review.
- [ ] Before removal: status, unpushed commits and PR state checked;
      `git worktree remove` then `git worktree prune`; anything with work
      left was shown to the user, not removed.
