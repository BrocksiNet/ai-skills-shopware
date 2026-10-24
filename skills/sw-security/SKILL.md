---
name: sw-security
description: >-
  Use when adding or changing a controller, Store-API route, Admin route,
  ACL privilege, webhook, or anything that reads a secret or an access key.
  Do NOT use for generic OWASP lectures, PHPUnit structure
  (sw-testing), or OpenAPI shape without a privilege or credential
  (sw-plugin-development).
license: MIT
metadata:
  contexts: core plugin app project
  tasks: build review
---

# Shopware security

Delta rules for **Shopware-specific** security mistakes — not a general security
course. Pair with `sw-plugin-development` / `sw-app-development` for
surface-specific wiring.

Read only the reference that matches the task or the files it changes:

<!-- routes:start: generated from routes.json by `node tools/bin/render-routes.ts`; do not edit -->
| Read | When | Or the change touches |
| ---- | ---- | --------------------- |
| [`secrets-and-config.md`](references/secrets-and-config.md) | Code reads a secret, an access key or a config value. | `.env`, `.env.*`, `sw-access-key\|SW_ACCESS_KEY`, … |
| [`api-acl-and-input.md`](references/api-acl-and-input.md) | You add or change a route, an ACL privilege or user input handling. | `#[Route(`, … |
| [`apps-and-webhooks.md`](references/apps-and-webhooks.md) | An app or webhook sends or receives data. | `manifest.xml`, `shopware-(shop\|app)-signature`, … |
<!-- routes:end -->

## Hard guardrails

1. **SEC-002** **Never log** secrets or full authorization headers.
2. **SEC-003** **Store-API and Admin routes** must declare appropriate ACL / login requirements.
3. **SEC-004** **App manifests** use least privilege — no wildcard permissions without justification.

## Definition of done

- [ ] Secrets from env / secret store; `.env` gitignored; examples use placeholders.
- [ ] Custom API routes have ACL or documented public scope.
- [ ] App permissions minimal; webhook payloads verified when applicable.

## Further reading

- [`docs/skill-resolution.md`](../../docs/skill-resolution.md) — install profiles
- MCP local keys: `sw-podman-dev` / `docs/tooling-stack.md` (local only)
