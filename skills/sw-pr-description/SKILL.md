---
name: sw-pr-description
description: >-
  Fill the shopware/shopware pull request section skeleton. Use when the PR
  body must follow the GitHub template sections, or when shopware-pr-hygiene
  is not installed. On trunk, shopware-pr-hygiene owns the decision to write
  the PR. Do NOT use for a plugin PR, for RELEASE_INFO file content
  (sw-core-development), or when the request is only that the tests are
  green and the PR should be opened.
license: MIT
---

# Shopware core PR descriptions

Migrated from the former `.cursor/rules/pr-template.mdc` in `shopware-trunk`.

When creating a pull request against `shopware/shopware`, use the GitHub PR
template from `.github/PULL_REQUEST_TEMPLATE.md` and fill every section.

> **Upstream (trunk):** `shopware-pr-hygiene` owns opening for "write the PR".
> This skill is the section skeleton it should read. When hygiene is absent,
> this skill owns the template itself. The skeleton is
> `references/pr-body-template.md`.

Read the reference that matches the task or the files it changes:

<!-- routes:start: generated from routes.json by `node tools/bin/render-routes.ts`; do not edit -->
| Read | When | Or the change touches |
| ---- | ---- | --------------------- |
| [`pr-body-template.md`](references/pr-body-template.md) | You write the PR body. | any change |
<!-- routes:end -->

## Rules

- **PRD-001** Fill the five sections of `.github/PULL_REQUEST_TEMPLATE.md`
  and nothing else: no extra top-level section such as "Validation". The
  only addition is the template's own `#### Impact` sub-section under
  section 2, and only when one of its cases applies.
- **PRD-002** Return the filled body in one outer code block for copy-paste.
  When the body shows code, fence the outer block with four backticks.
- **PRD-003** Write what the diff cannot show: the problem, the approach in a
  sentence or two, the impact. Do not retell the diff, argue for each
  choice, or describe the work session. When the template on trunk has an
  agent block, its rules win.
- **PRD-004** Link issues in section 1 with `closes #N` (closes on merge) or
  `relates #N`.
- **PRD-005** Use a conventional PR title when asked, for example
  `fix(Checkout): allow TestBootstrapper to activate Composer plugins`.
- **PRD-006** After review feedback or a CI failure, push a follow-up commit
  for the fix. Do not amend or force-push unless the user asks.
- **PRD-007** Never add AI attribution trailers such as `Co-authored-by`,
  `Co-committed-by` or `Signed-off-by` for an agent, in any capitalisation.
- **PRD-008** Tick only the checklist items that are true for this PR.
- **PRD-009** For a diff over about 400 lines, say in section 4 why it is not
  split, or name the follow-up PRs.

Pair with `sw-core-development` when the change needs RELEASE_INFO or
UPGRADE entries. Confirm CI is green before marking the PR ready for review
(`sw-review-learnings` pre-submit).

## Definition of done

- [ ] All five template sections addressed; "Impact" only when it applies.
- [ ] Checklist reflects the real change (tests, release notes, docs, comments).
- [ ] Output is one copy-paste-ready markdown block.
