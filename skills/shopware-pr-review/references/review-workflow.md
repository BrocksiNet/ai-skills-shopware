# PR review reaction workflow

## Fetch review context

Use whichever GitHub tooling is available in the session:

- GitHub MCP (`pr_comments`, `pr_reviews`, `pr_files`, `pr_diff`)
- or `gh pr view <n> --comments`, `gh api repos/.../pulls/<n>/comments`

Read the **full thread**, not only the latest line. Check the diff hunk the
comment attaches to.

After applying fixes for review or CI feedback, prefer a **new follow-up commit**
with a message that explains the fix. Do **not** amend or force-push unless the
user explicitly asks (pairs with `shopware-pr-description`).

## Decision matrix

| Situation | Action |
| --------- | ------ |
| Reviewer is right; code or test is wrong | Fix in branch, reply briefly that it is fixed |
| Reviewer asks a question / wants rationale | Reply with explanation; no code change unless new info changes the approach |
| Reviewer requests a change you intentionally rejected | Push back politely with concrete reason (design constraint, scope, upstream pattern) |
| Reviewer and you both have partial points | Fix the valid part; explain the part you keep |

Always tell the user **how confident you are (0–100%)** in the chosen action.

## Reply templates (adapt, do not copy blindly)

**Fix applied:**

```markdown
Good catch — adjusted in <file/commit>. <one sentence what changed>.
```

**Clarification:**

```markdown
<Direct answer to the question. Reference code path or ADR if helpful.>
```

**Push back:**

```markdown
I kept this as-is because <concrete reason>. Happy to revisit if <condition>.
```

## Turn findings into lasting rules

If the same review comment category appears more than once:

1. **Platform-wide convention** → `coding-guidelines/` in shopware/shopware.
2. **Personal / team agent guidance** → `ai-skills-shopware` skill or reference.
3. **One-off PR context** → PR description or sticky comment only.

Do not recreate gitignored `.cursor/rules/` — use `ai-skills-shopware` as the
durable store.
