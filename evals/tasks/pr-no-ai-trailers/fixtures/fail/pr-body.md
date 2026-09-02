### 1. Why is this change necessary?
CartProcessor cannot be decorated by plugins today.

### 2. What does this change do, exactly?
Make CartProcessor extensible so plugins can decorate cart calculation.

### 3. Describe each step to reproduce the issue or behaviour.
1. Install a plugin that needs to decorate CartProcessor.
2. The decoration is ignored.

### 4. Please link to the relevant issues (if any).
relates #12345

### 5. Checklist
- [x] I have written tests and verified that they fail without my change
- [x] I have updated developer-facing release notes if this change is **relevant** for external developers
- [ ] I have written or adjusted the documentation according to my changes
- [ ] This change has comments for package types, values, functions, and non-obvious lines of code
- [x] I have read the contribution requirements and fulfilled them

Co-committed-by: Cursor <cursoragent@cursor.com>
