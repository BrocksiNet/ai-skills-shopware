---
name: shopware-pr-description
description: >-
  Shopware/shopware pull request section skeleton. Use when the PR body must
  follow the GitHub template sections, or when shopware-pr-hygiene is not
  installed. On trunk, shopware-pr-hygiene owns the decision to write the PR.
  Do NOT use for a plugin PR, for RELEASE_INFO file content
  (shopware-core-development), or when the request is only that the tests
  are green and the PR should be opened.
---

# Shopware core PR descriptions

Migrated from the former `.cursor/rules/pr-template.mdc` in `shopware-trunk`.

When creating a pull request against `shopware/shopware`, use the GitHub PR
template from `.github/PULL_REQUEST_TEMPLATE.md` and fill every section.

> **Upstream (trunk):** `shopware-pr-hygiene` owns opening for "write the PR".
> This skill is the section skeleton it should read. When hygiene is absent,
> this skill owns the template itself. The skeleton is
> `references/pr-body-template.md`.

Load the skeleton on demand:
[`references/pr-body-template.md`](references/pr-body-template.md)

## Rules

- Follow `.github/PULL_REQUEST_TEMPLATE.md` **closely** — fill sections 1–5 only.
- **Do not add extra PR description sections** (for example a separate “Validation”
  or “Testing notes” block outside the template).
- Provide the filled PR body **always in a single outer code block** for easy copy.
- **Never nest code blocks** inside that block — nested fences break copy-paste.
- Fill sections 1–4 from the actual branch diff.
- Link issues with `closes #N` (auto-closes on merge) or `relates #N`.
- Use a **conventional PR title** when requested (e.g.
  `fix(Checkout): allow TestBootstrapper to activate Composer plugins`).
- After review feedback or CI failures, add a **follow-up commit** explaining that
  fix — do not amend or force-push unless the user explicitly asks.
- Never add AI-agent attribution trailers such as `Co-authored-by`,
  `Co-committed-by`, or `Signed-off-by`.
- Check applicable checklist items; leave unchecked items that do not apply.
- Keep descriptions factual and concise — no hype.
- Pair with `shopware-core-development` when the change needs RELEASE_INFO or
  UPGRADE entries.
- If the diff is large (&gt;~400 lines), say why it is not split or note follow-up
  PRs. Confirm CI is green before marking ready for review (`shopware-review-learnings`
  pre-submit).

## Definition of done

- [ ] All five template sections addressed.
- [ ] Checklist reflects the real change (tests, release notes, docs, comments).
- [ ] Output is one copy-paste-ready markdown block with no nested fences.
