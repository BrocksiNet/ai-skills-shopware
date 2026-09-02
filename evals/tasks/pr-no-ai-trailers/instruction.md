# Task: strip AI attribution trailers from a core PR body

`pr-body.md` is a filled shopware/shopware PR template. It still has
AI-agent attribution trailers.

- Remove every `Co-authored-by`, `Co-committed-by`, and `Signed-off-by` line.
- Keep sections 1–5 and the existing description text.
- Do not add extra PR description sections.
