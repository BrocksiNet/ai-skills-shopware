---
name: sw-security
description: >-
  Shopware security rules for controllers, Store/Admin API routes, ACL
  privileges, webhooks, and secrets or access keys. Load before changing route
  auth, ACL, or secret handling. Do NOT use for generic OWASP lectures, PHPUnit
  (sw-testing), or non-auth OpenAPI shape (sw-plugin-development).
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
| [`untrusted-xml.md`](references/untrusted-xml.md) | Code parses XML that comes from an upload, a feed, an API response or another extension. | `XmlUtils::(parse\|loadFile)(`, … |
| [`mcp-tool-acl.md`](references/mcp-tool-acl.md) | A plugin adds or changes an MCP tool or the privileges it declares. | `#[McpTool(Requires\|RequiresNoPrivilege)?(`, … |
<!-- routes:end -->

## Hard guardrails

1. **SEC-001** **Never commit** sales channel access keys, app secrets, webhook signing keys,
   or Admin API passwords in source, fixtures committed to git, or skill examples.
2. **SEC-002** **Never log** secrets or full authorization headers.
3. **SEC-003** **Store-API and Admin routes** must declare appropriate ACL / login requirements.
4. **SEC-004** **App manifests** use least privilege — no wildcard permissions without justification.
5. Parse XML from uploads, feeds or other extensions with `XmlParser`, not
   `XmlUtils` (see `untrusted-xml.md`).
6. An MCP tool checks its privileges itself; `#[McpToolRequires]` only
   documents them (see `mcp-tool-acl.md`).

## Definition of done

- [ ] Secrets from env / secret store; `.env` gitignored; examples use placeholders.
- [ ] Custom API routes have ACL or documented public scope.
- [ ] App permissions minimal; webhook payloads verified when applicable.
- [ ] XML from outside parsed with `XmlParser`; MCP tools call their privilege check.

## Further reading

- [`docs/skill-resolution.md`](../../docs/skill-resolution.md) — install profiles
- MCP local keys: `sw-local-dev` / `docs/tooling-stack.md` (local only)

## Already enforced by CI (do not repeat)

<!-- enforced:start: generated from rules/catalog.json by `node tools/bin/render-enforced.ts`; do not edit -->
CI already fails the build on these, so do not repeat them in reviews or
checklists. Flag only what each check misses.
Checks marked *trunk only* are not active in plugin or app projects by
default; there the rule still needs a reviewer.

- `SEC-009` `PregDollarWithoutDRule` (PHPStan, trunk only) reports a `$` without the `D` modifier and any `\Z` in `preg_*` patterns, the Symfony `Regex` constraint and the Finder regex filters, in core's enabled namespaces. It misses patterns built at runtime, regexes in Twig or JavaScript, and every extension, because the rule ships only in core's PHPStan config; flag those.
- `SEC-010` `NoXmlUtilsParsingRule` (PHPStan, trunk only) reports a static `XmlUtils::parse()` or `XmlUtils::loadFile()` call outside `XmlParser` and test classes. It misses other XML parsers (`DOMDocument::loadXML()`, `simplexml_load_*`), and every extension, because the rule ships only in core's PHPStan config; flag those.
- `SEC-011` `McpAdminToolRequiresPrivilegeRule` (PHPStan, trunk only) reports an Admin API MCP tool with neither `#[McpToolRequires]` nor `#[McpToolRequiresNoPrivilege]`, with both, or with the opt-out and a `requirePrivilege()` or `requirePrivilegeResult()` call in its own class. It misses whether a `#[McpToolRequires]` tool really calls a privilege check, tools the compiled container does not know, and every extension, because the rule ships only in core's PHPStan config; flag those.
- `SEC-011` `McpStoreApiToolAdminAclRule` (PHPStan, trunk only) reports a Store API MCP tool (`shopware.store_api_mcp.tool`) that declares `#[McpToolRequires]` or calls `requirePrivilege()` or `requirePrivilegeResult()` in its own class. It misses inherited `requirePrivilege*()` calls from parent classes or traits, tools the compiled container does not know, and every extension, because the rule ships only in core's PHPStan config; flag those.
<!-- enforced:end -->
