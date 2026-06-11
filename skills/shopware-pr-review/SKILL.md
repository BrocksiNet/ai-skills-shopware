---
name: shopware-pr-review
description: >-
  React to GitHub pull request review comments on shopware/shopware (or your
  forks). Use when triaging reviewer feedback, deciding fix vs reply vs push
  back, drafting PR comment answers, or turning a review finding into a lasting
  rule. Triggers on "react to review", "reply to reviewer", "address PR
  comments", "what should I answer", "review comment", "code review feedback".
  Do NOT use for writing the initial PR body (shopware-pr-description) or
  idiomatic code review without GitHub threads (shopware-review-learnings).
---

# Shopware PR review reactions

Migrated from the former `.cursor/rules/review.mdc` in `shopware-trunk`.

Load on demand:
[`references/review-workflow.md`](references/review-workflow.md)

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

## PR reply format

When drafting a **GitHub review reply** for the user to paste:

- One outer fenced markdown block only.
- No nested code blocks inside the reply.
- No em dashes.
- Plain, direct language (pairs with `shopware-assistant-style`).

## Definition of done

- [ ] Every open review thread has a classified action (fix / reply / push back).
- [ ] Confidence stated per thread when recommending an action.
- [ ] Replies are single copy-paste blocks without nested fences.
- [ ] Recurring findings proposed as `coding-guidelines` or skill updates.
