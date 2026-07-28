---
name: shopware-pr-description
description: >-
  Pull request body format for shopware/shopware contributions. Use when
  creating or updating a PR description, drafting a contribution for the Shopware
  core repo, or when asked to fill in the GitHub PR template. Triggers on
  "write a PR description", "create a pull request for shopware", "fill the PR
  template", "@pr-template", "update the PR body". Do NOT use for release-note
  file content (shopware-core-development) or plugin/app PRs outside
  shopware/shopware.
---

# Shopware core PR descriptions

Migrated from the former `.cursor/rules/pr-template.mdc` in `shopware-trunk`.

When creating a pull request against `shopware/shopware`, use the GitHub PR
template from `.github/PULL_REQUEST_TEMPLATE.md` and fill every section.

> **Upstream (trunk):** If `.agents/skills/shopware-pr-hygiene/` exists, defer
> PR template and follow-up commit rules to core; this skill keeps the copy-paste
> skeleton in `references/pr-body-template.md`.

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
