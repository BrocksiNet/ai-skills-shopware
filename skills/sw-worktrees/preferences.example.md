# sw-worktrees preferences

Template for your personal answers. Copy it to
`${AI_SKILLS_SHOPWARE_PREFS_DIR:-~/.config/ai-skills-shopware}/sw-worktrees/preferences.md`
and change the values; delete a key to keep its default. The file stays on
your machine and is never committed.

Each comment is the question an agent asks when it offers to create the file.

```yaml
# Where should all worktrees live? An absolute path.
# Default (empty): a worktrees/ folder next to the main checkout's folder.
worktree_root: ""

# One folder per project (<root>/<project>/<name>) or one flat folder
# (<root>/<project>--<name>)? per-project | flat
layout: per-project

# Shorter folder names for some repositories? GitHub repo name: folder name.
project_aliases: {}
#   shopware-private: swp

# Store relative paths between the main checkout and its worktrees
# (git worktree add --relative-paths, Git 2.48+)? true | false
relative_paths: false

# When a PR is merged, ask before removing its worktree, or remove it
# automatically when it has no uncommitted or unpushed work? ask | auto
cleanup_after_merge: ask
```
