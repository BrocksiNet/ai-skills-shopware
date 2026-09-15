# Use-case: storefront / Admin frontend

For Twig themes, storefront JS plugins, and Administration Vue/TS. Install
these **in addition to** the PHP use-case you already use
([`plugin-development.md`](plugin-development.md) for most people).

Do **not** add these to the default PHP one-liners. They fire on frontend
paths and would be noise on a DAL-only change.

## Skills for this use-case

| Skill | Why |
| ----- | --- |
| `shopware-storefront` | Twig/theme, PluginManager, Bootstrap SCSS, cache-safe AJAX. |
| `shopware-admin-js` | Admin TypeScript, Meteor `mt-*`, Jest, Admin ACL. |
| `shopware-research-and-escalation` | Versioned docs + Modern Web Guidance CLI after primitives. |
| `shopware-review-learnings` | Recurring frontend findings (uncached listing AJAX, …). |

PHP behind a storefront controller or Admin route still needs the plugin /
core / app surface skill from the other use-cases.

## Install (one-liner)

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill shopware-storefront \
  --skill shopware-admin-js \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  -a claude-code -a codex -a cursor
```

Install at **project level**. Pin with `BrocksiNet/ai-skills-shopware@vX.Y.Z`.

## Optional: Modern Web Guidance CLI

For leftover generic CSS/HTML/JS APIs (LCP on an existing product image,
container queries in custom SCSS), call the CLI — do **not** install
Google's `modern-web-guidance` skill next to ours:

```bash
npx -y modern-web-guidance@latest search "optimize product image LCP"
```

See [`docs/tooling-stack.md`](../docs/tooling-stack.md) and
`skills/shopware-research-and-escalation/references/modern-web-guidance.md`.
Set `DISABLE_TELEMETRY=1` to opt out of Google search-string telemetry.

## Mixing use-cases

Add this set beside [`plugin-development.md`](plugin-development.md) or
[`core-development.md`](core-development.md). Surface routing keeps PHP
rules and frontend rules from firing on the wrong files.
