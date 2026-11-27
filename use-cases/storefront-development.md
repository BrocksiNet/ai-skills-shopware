# Use-case: storefront / Admin frontend

For Twig themes, storefront JS plugins, and Administration Vue/TS. Install
these **in addition to** the PHP use-case you already use
([`plugin-development.md`](plugin-development.md) for most people).

Do **not** add these to the default PHP one-liners. They fire on frontend
paths and would be noise on a DAL-only change.

## Skills for this use-case

| Skill | Why |
| ----- | --- |
| `sw-storefront` | Twig/theme, PluginManager, Bootstrap SCSS, cache-safe AJAX. |
| `sw-admin-js` | Admin TypeScript, Meteor `mt-*`, Jest, Admin ACL. |
| `sw-research-and-escalation` | Versioned docs; `modern-web-guidance` is the companion after primitives. |
| `sw-review-learnings` | Recurring frontend findings (uncached listing AJAX, …). |
| `sw-change-impact` | After a feature works: shared cache and checkout cost, not only the new UI. |
| `sw-skill-router` | Lists the skills and references a diff or plan needs (`/sw-skill-router`). |
| `sw-help` | What every skill is for, with example prompts (`/sw-help`). |

PHP behind a storefront controller or Admin route still needs the plugin /
core / app surface skill from the other use-cases.

## Install (one-liner)

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill sw-skill-router \
  --skill sw-help \
  --skill sw-storefront \
  --skill sw-admin-js \
  --skill sw-research-and-escalation \
  --skill sw-review-learnings \
  --skill sw-change-impact \
  -a claude-code -a codex -a cursor
```

Install at **project level**. Pin with `BrocksiNet/ai-skills-shopware@vX.Y.Z`.

## Default companion: Modern Web Guidance

Install Google's `modern-web-guidance` skill next to ours for generic CSS,
HTML, JS, Core Web Vitals and a11y questions that Shopware does not own
(LCP on an existing product image, container queries in custom SCSS, focus
handling). Take only this skill, not `chrome-extensions`:

```bash
npx skills add GoogleChrome/modern-web-guidance --skill modern-web-guidance
```

Shopware components win when both apply: Bootstrap in the Storefront,
Meteor `mt-*` and `sw-*` in the Administration, and no speculation rules on
cart, checkout, account or wishlist. The skill's CLI searches guides and
retrieves one; adapt the result to Twig, SCSS or Vue.

```bash
npx -y modern-web-guidance@latest search "optimize product image LCP"
```

Set `DISABLE_TELEMETRY=1` to stop anonymous usage data going to Google. More
in [`docs/using/tooling-stack.md`](../docs/using/tooling-stack.md) and
`skills/sw-research-and-escalation/references/modern-web-guidance.md`.

## Mixing use-cases

Add this set beside [`plugin-development.md`](plugin-development.md) or
[`core-development.md`](core-development.md). Surface routing keeps PHP
rules and frontend rules from firing on the wrong files.
