---
name: sw-pr-review
description: >-
  Triage and answer GitHub pull request review comments on shopware/shopware
  (or your forks). Use when reacting to a review, replying to a reviewer,
  addressing PR comments, deciding fix vs reply vs push back, drafting what to
  answer, or turning a review finding into a lasting rule. Do NOT use for
  writing the initial PR body (sw-pr-description) or idiomatic code
  review without GitHub threads (sw-review-learnings).
license: MIT
---

# Shopware PR review reactions

Migrated from the former `.cursor/rules/review.mdc` in `shopware-trunk`.

Read the reference that matches the task or the files it changes:

<!-- routes:start: generated from routes.json by `node tools/bin/render-routes.ts`; do not edit -->
| Read | When | Or the change touches |
| ---- | ---- | --------------------- |
| [`review-workflow.md`](references/review-workflow.md) | You triage review threads or draft replies. | any change |
<!-- routes:end -->

## Workflow

1. **Fetch context** — PR comments, review threads, and changed files (GitHub MCP
   or `gh pr view` / `gh api`). Do not guess what reviewers said.
2. **Classify each thread** — valid fix, clarification reply, or invalid /
   intentional (push back with reasoning).
3. **State confidence** — give an explicit percentage (e.g. "85% fix") when
   recommending fix vs reply vs push back.
4. **Execute** — code/test change, or a copy-paste PR reply (see below).
5. **Generalize** — if the finding will recur, propose a rule in
   `coding-guidelines/` or in `ai-skills-shopware` (not a one-off `.cursor/rules`
   file).
6. **Feature impact** — if the change is a finished feature, not only a
   thread reply, the blast-radius review belongs to `sw-change-impact`.
   Do not duplicate that checklist here.

## PR reply format

When drafting a **GitHub review reply** for the user to paste:

- One outer fenced markdown block only.
- No nested code blocks inside the reply.
- No em dashes.
- Plain, direct language (pairs with `sw-assistant-style`).

## Definition of done

- [ ] Every open review thread has a classified action (fix / reply / push back).
- [ ] Confidence stated per thread when recommending an action.
- [ ] Replies are single copy-paste blocks without nested fences.
- [ ] Recurring findings proposed as `coding-guidelines` or skill updates.
