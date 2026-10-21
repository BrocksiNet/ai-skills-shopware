# PR body template (shopware/shopware)

The source is `.github/PULL_REQUEST_TEMPLATE.md` on trunk. GitHub uses it for
every PR, release branches included. When the file is in the checkout, read
it: its comment block at the bottom holds the maintainers' writing rules for
agents, and those win over this summary.

Skeleton since [shopware/shopware#21627](https://github.com/shopware/shopware/pull/21627).
Drop the HTML comments once a section is filled.

```markdown
### 1. What and why?

- closes #123
- The problem in one sentence. Without an issue: why the change is needed,
  including the business context.

### 2. How?

- The approach in one or two sentences.

#### Impact

- Only when the PR changes a public API, breaks BC, adds a migration or
  schema change, changes configuration, or adds work to a hot path (cart,
  checkout, listings, indexing). Name what changes and what extension
  developers must do.

### 3. Testing

1. Steps to reproduce or verify.
2. Expected vs. actual result.

- Environment if relevant. Screenshots or a recording for UI changes.

### 4. Additional notes

- Follow-up work, or where reviewers should look closely.

### 5. Checklist

- [ ] I have read and followed the [contribution guidelines](https://github.com/shopware/shopware/blob/trunk/CONTRIBUTING.md#pull-request-checklist)
- [ ] **Only** non-obvious code is commented
- [ ] Tests added, and they fail without this change
- [ ] Release notes updated, if relevant for external developers ([how to document a release](https://github.com/shopware/shopware/blob/trunk/delivery-process/documenting-a-release.md))
- [ ] Documentation and agent skills updated
```

## Writing the sections

- The reviewer reads the diff. Give them what it cannot show: the problem,
  the approach, the impact.
- Section 2 is not a walkthrough. If it accounts for every file, cut it to
  about a third.
- Leave "Impact" out unless one of its cases applies. Never write what did
  not change ("no BC break", "purely additive").
- For hot-path cost, give the cost per request or per item. Numbers only if
  measured.
- Describe the change, not the session that produced it.
- Short bullets, fragments are fine, no em dashes.

## Output rules for the agent

- Return the **filled** template in one outer fenced markdown block.
- When the body shows code, fence that code with three backticks and the
  outer block with four, so the copy keeps working.
- Tick only the checklist items that are true; do not invent completed work.
