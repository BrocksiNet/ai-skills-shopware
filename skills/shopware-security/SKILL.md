---
name: shopware-security
description: >-
  Use when adding or changing a controller, Store-API route, Admin route,
  ACL privilege, webhook, or anything that reads a secret or an access key.
  Do NOT use for generic OWASP lectures, PHPUnit structure
  (shopware-testing), or OpenAPI shape without a privilege or credential
  (shopware-plugin-development).
license: MIT
---

# Shopware security

Delta rules for **Shopware-specific** security mistakes — not a general security
course. Pair with `shopware-plugin-development` / `shopware-app-development` for
surface-specific wiring.

Read only the reference that matches the task:

- Read [`references/secrets-and-config.md`](references/secrets-and-config.md) when code reads a secret, an access key or a config value.
- Read [`references/api-acl-and-input.md`](references/api-acl-and-input.md) when you add a route, an ACL privilege or user input handling.
- Read [`references/apps-and-webhooks.md`](references/apps-and-webhooks.md) when an app or webhook sends or receives data.

## Hard guardrails

1. **Never commit** sales channel access keys, app secrets, webhook signing keys,
   or Admin API passwords in source, fixtures committed to git, or skill examples.
2. **Never log** secrets or full authorization headers.
3. **Store-API and Admin routes** must declare appropriate ACL / login requirements.
4. **App manifests** use least privilege — no wildcard permissions without justification.

## Definition of done

- [ ] Secrets from env / secret store; `.env` gitignored; examples use placeholders.
- [ ] Custom API routes have ACL or documented public scope.
- [ ] App permissions minimal; webhook payloads verified when applicable.

## Further reading

- [`docs/skill-resolution.md`](../../docs/skill-resolution.md) — install profiles
- MCP local keys: `shopware-podman-dev` / `docs/tooling-stack.md` (local only)
