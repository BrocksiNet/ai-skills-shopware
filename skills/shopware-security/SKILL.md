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

Read only the reference that matches the task or the files it changes:

<!-- routes:start: generated from routes.json by `node tools/bin/render-routes.ts`; do not edit -->
| Read | When | Or the change touches |
| ---- | ---- | --------------------- |
| [`secrets-and-config.md`](references/secrets-and-config.md) | Code reads a secret, an access key or a config value. | `.env`, `.env.*`, `auth.json`, `.mcp.json`, `sw-access-key\|SW_ACCESS_KEY`, `getenv(\|%env(`, `SystemConfigService`, `[Aa]pp[Ss]ecret\|APP_SECRET\|[Aa]pi[Kk]ey\|API_KEY` |
| [`api-acl-and-input.md`](references/api-acl-and-input.md) | You add a route, an ACL privilege or user input handling. | `#[Route(`, `_acl`, `_loginRequired`, `addPrivilegeMappingEntry(`, `$request->(get(\|query->\|request->)` |
| [`apps-and-webhooks.md`](references/apps-and-webhooks.md) | An app or webhook sends or receives data. | `manifest.xml`, `shopware-(shop\|app)-signature`, `<webhook\b`, `hash_hmac(` |
<!-- routes:end -->

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
