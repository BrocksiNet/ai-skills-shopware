# Use-case: extension review

For reviewing a plugin or app diff as a whole before it merges, ships or goes
to the Store: `shopware-extension-review` picks the rules by changed path and
reports findings with rule IDs and severities. It owns the workflow only; the
rules stay in their topic skills and the review reads their references. A
reference whose skill is not installed is skipped, so install the set.

Core pull requests to `shopware/shopware` are out of scope: core's `sw-review`
reviews those on trunk.

## Skills for this use-case

| Skill | Why |
| ----- | --- |
| `shopware-extension-review` | Workflow, severity scale, findings output. |
| `shopware-plugin-development` | DAL, API contracts, cache tags, migrations, version compatibility. |
| `shopware-app-development` | Manifest, permissions, app scripts. |
| `shopware-security` | Secrets, route ACL and input, webhooks. |
| `shopware-storefront` | Twig, theme and JS plugin public API, HTTP cache. |
| `shopware-admin-js` | Admin architecture and extension API. |
| `shopware-architecture` | Workers and services, extension mechanisms, DAL contracts. |
| `shopware-review-learnings` | API-aware and DAL performance findings. |
| `shopware-testing` | Test shape, integration tests, exception assertions. |
| `shopware-change-impact` | The blast radius hand-off after the review. |

## Install (one-liner)

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill shopware-extension-review \
  --skill shopware-plugin-development \
  --skill shopware-app-development \
  --skill shopware-security \
  --skill shopware-storefront \
  --skill shopware-admin-js \
  --skill shopware-architecture \
  --skill shopware-review-learnings \
  --skill shopware-testing \
  --skill shopware-change-impact \
  -a claude-code -a codex -a cursor
```

Install at **project level** (the default). Pin with `BrocksiNet/ai-skills-shopware@vX.Y.Z`.

For Store compliance checks, also install the Shopware CLI skills (the review
hands off to `shopware-cli-extension-store` when it is there):

```bash
npx skills add shopware/shopware-cli
```
