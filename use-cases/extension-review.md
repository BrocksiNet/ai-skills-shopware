# Use-case: extension review

For reviewing a plugin or app diff as a whole before it merges, ships or goes
to the Store: `sw-extension-review` picks the rules by changed path and
reports findings with rule IDs and severities. It owns the workflow only; the
rules stay in their topic skills and the review reads their references. A
reference whose skill is not installed is skipped, so install the set.

Core pull requests to `shopware/shopware` are out of scope: core's `sw-review`
reviews those on trunk.

## Skills for this use-case

| Skill | Why |
| ----- | --- |
| `sw-extension-review` | Workflow, severity scale, findings output. |
| `sw-plugin-development` | DAL, API contracts, cache tags, migrations, version compatibility. |
| `sw-app-development` | Manifest, permissions, app scripts. |
| `sw-security` | Secrets, route ACL and input, webhooks. |
| `sw-storefront` | Twig, theme and JS plugin public API, HTTP cache. |
| `sw-admin-js` | Admin architecture and extension API. |
| `sw-architecture` | Workers and services, extension mechanisms, DAL contracts. |
| `sw-review-learnings` | API-aware and DAL performance findings. |
| `sw-testing` | Test shape, integration tests, exception assertions. |
| `sw-change-impact` | The blast radius hand-off after the review. |

## Install (one-liner)

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill sw-extension-review \
  --skill sw-plugin-development \
  --skill sw-app-development \
  --skill sw-security \
  --skill sw-storefront \
  --skill sw-admin-js \
  --skill sw-architecture \
  --skill sw-review-learnings \
  --skill sw-testing \
  --skill sw-change-impact \
  -a claude-code -a codex -a cursor
```

Install at **project level** (the default). Pin with `BrocksiNet/ai-skills-shopware@vX.Y.Z`.

For Store compliance checks, also install the Shopware CLI skills (the review
hands off to `shopware-cli-extension-store` when it is there):

```bash
npx skills add shopware/shopware-cli
```
