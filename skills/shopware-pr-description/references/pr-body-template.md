# PR body template (shopware/shopware)

Copy this skeleton and fill each section from the branch changes.

```markdown
### 1. Why is this change necessary?
<!-- One or two sentences explaining the problem or motivation -->

### 2. What does this change do, exactly?
<!-- Concise description of the fix/feature -->

### 3. Describe each step to reproduce the issue or behaviour.
<!-- Numbered steps or a short explanation -->

### 4. Please link to the relevant issues (if any).
<!-- Use: closes #123 or relates #123 -->

### 5. Checklist
- [ ] I have written tests and verified that they fail without my change
- [ ] I have updated developer-facing release notes if this change is **relevant** for external developers
- [ ] I have written or adjusted the documentation according to my changes
- [ ] This change has comments for package types, values, functions, and non-obvious lines of code
- [ ] I have read the contribution requirements and fulfilled them
```

## Output rules for the agent

- Return the **filled** template in one outer fenced markdown block.
- Do not put another fenced block inside section 5 or any section.
- Uncheck checklist items that do not apply; do not invent completed work.
