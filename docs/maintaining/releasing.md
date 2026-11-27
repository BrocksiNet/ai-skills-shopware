# Releasing

Cutting a release and writing its changelog entry. Overview: [Staying current](README.md).

## Cutting a release

1. On a `chore/release-vX.Y.Z` branch, move `[Unreleased]` in
   [`CHANGELOG.md`](../../CHANGELOG.md) into a dated section, written from the
   commits since the last tag (PRs do not fill `[Unreleased]`). Update the
   compare links at the bottom, and bump `.skills-version` and, in
   [`.claude-plugin/marketplace.json`](../../.claude-plugin/marketplace.json),
   the plugin `version` and source `ref` (a test fails when they differ).
   Plugin installs fail between the merge and the release, because the tag
   does not exist yet, so publish right after merging.
2. Open the PR, wait for green CI and squash-merge it.
3. Publish the release from the merge commit:

   ```bash
   node tools/bin/release-notes.ts vX.Y.Z > /tmp/notes.md
   gh release create vX.Y.Z --target <merge sha> --title vX.Y.Z --notes-file /tmp/notes.md
   ```

   GitHub turns every newline in a release body into a line break, so the
   tool joins the CHANGELOG's wrapped lines and makes repo-relative links
   point at the tag. Never paste the raw section.

### Writing the entry

The release notes are for people who use the skills, not for whoever wrote
the code. Read the entry out loud; if it sounds like a commit log, rewrite it.

- Open with two or three sentences: what is new and why someone would
  update.
- One item per change a user notices. Start with a short bold lead-in
  (`**Git worktrees in one place.**`) and then say what it does for them in
  plain words.
- Name the skill once, in a code span. Leave rule IDs, eval task names and
  file paths out unless the reader has to type them.
- Use `Added`, `Changed`, `Fixed` and `Removed` for user-facing changes.
  Eval, grader, CI and tooling work goes last, under `For contributors`, in
  a few short lines.
- Use full sentences, few code spans and no lists packed into one line; if
  an item needs more than three lines, link the doc instead.

Contributor details: [`AGENTS.md`](../../AGENTS.md).
