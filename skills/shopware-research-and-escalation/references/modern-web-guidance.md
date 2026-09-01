# Modern Web Guidance (companion lookup)

Load this when the question is a **generic** modern CSS / HTML / client-JS
platform API (dialog, popover, container queries, view transitions, LCP/INP,
`:has()`, speculation rules) and Shopware does not already own a primitive
for it.

[Modern Web Guidance](https://github.com/GoogleChrome/modern-web-guidance) is
a separate skill pack plus a local CLI. We do **not** vendor its guides. Do
**not** install their `SKILL.md` next to ours by default — it claims every
HTML/CSS/JS task and will drown Shopware storefront / Admin rules.

## How to look up a guide

```bash
npx -y modern-web-guidance@latest search "<what you want to achieve>"
npx -y modern-web-guidance@latest retrieve "<guide-id>"
```

Prefer `pnpx` when `pnpm` is available. Allowlist
`npx -y modern-web-guidance@latest *`, never bare `npx *`.
Set `DISABLE_TELEMETRY=1` if the team does not want Google to record search
strings (install counts and guide IDs are collected otherwise).

## Shopware browser / primitive policy

Treat this as the custom support policy MWG asks for:

- Allow **Baseline widely available** features as progressive enhancement.
- **Never replace** a Shopware primitive: Twig blocks, theme inheritance,
  Bootstrap storefront components, `PluginManager` plugins, Meteor / `mt-*`
  Admin components, Admin `Shopware.Component` / services / stores.
- **No speculation rules or prerender** on cart, checkout, account, or
  wishlist. Those paths are cache- and session-sensitive.
- Prefer extending the existing theme / plugin / Admin module over inventing
  a new HTML root.
- After retrieving a guide, **adapt** it. Do not paste framework-agnostic
  markup into Twig or Vue Admin.

Storefront and Admin tasks start in `shopware-storefront` or
`shopware-admin-js`. Call this CLI only after those skills say Shopware has
no component for the job.

## Skip MWG entirely for

- Built-in on-device AI, WebMCP, passkeys (unless the user asked).
- Replacing Bootstrap dropdowns / modals / collapses.
- Replacing `mt-modal`, `mt-popover`, or other Meteor components.
- Cross-document view transitions on cached Twig storefront navigations
  without a measured need.
