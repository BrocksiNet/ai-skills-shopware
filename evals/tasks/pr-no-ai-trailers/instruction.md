# Task: strip AI attribution trailers from a core PR body

`pr-body.md` is a filled shopware/shopware PR template. It still has
AI-agent attribution trailers.

- Remove every AI attribution trailer, such as `Co-authored-by`,
  `Co-committed-by` and `Signed-off-by` lines for an agent.
- Keep sections 1–5, the Impact sub-section and the existing description text.
- Do not add extra PR description sections.
