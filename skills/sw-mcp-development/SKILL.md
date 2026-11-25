---
name: sw-mcp-development
description: >-
  Authoring and reviewing Shopware 6 MCP tools, prompts, and resources in
  plugins, apps, and core (experimental, targets 6.7.15+ / 6.8.0). Covers
  McpToolResponse, McpToolResult, tool groups, ToolAnnotations, dry-run writes,
  DAL criteria/includes, serverless app scripts, and resource templates. Do NOT
  use for MCP tool ACL privileges (sw-security), running/configuring an MCP
  server, or plain Store-API routes.
license: MIT
metadata:
  contexts: core plugin app project
  tasks: build review
---

# Shopware MCP development

> **Status: experimental (targets Shopware 6.7.15+ / 6.8.0).** Shopware's MCP
> classes carry `@experimental stableVersion:v6.8.0` and the API may still
> change until 6.8.0. Always enabled (no feature flag). When editing inside
> `shopware/shopware` trunk, the local `src/Core/Framework/Mcp/**/AGENTS.md`
> and `src/Storefront/Mcp/AGENTS.md` files lead over this skill.

Scope: authoring and reviewing MCP **tools**, **prompts**, and **resources**
in plugins, third-party Symfony bundles, apps, and core. Runtime setup and
configuring an MCP client or shop server are out of scope. MCP tool ACL and
privilege checks (`#[McpToolRequires]`, `#[McpToolRequiresNoPrivilege]`,
`requirePrivilegeResult()`, Store API vs Admin API ACL) belong to `sw-security`
(`SEC-011`) — load `sw-security` alongside this skill whenever a tool reads or
mutates shop data.

Read only the reference that matches the task or the files it changes:

<!-- routes:start: generated from routes.json by `node tools/bin/render-routes.ts`; do not edit -->
| Read | When | Or the change touches |
| ---- | ---- | --------------------- |
| [`tool-contract.md`](references/tool-contract.md) | You add or change a PHP MCP tool class, its DI service tag, tool group, annotations, dry-run behavior, or DAL criteria handling. | `Mcp/Tool/**/*.php`, `Mcp/**/*Tool.php`, `#[McpTool(Group\|DependsOn)?(`, … |
| [`apps-prompts-resources.md`](references/apps-prompts-resources.md) | An app declares MCP capabilities in Resources/mcp.xml or app scripts, or you add an MCP resource, resource template, or prompt. | `Resources/mcp.xml`, `Mcp/Resource/**/*.php`, `<mcp-(tool\|prompt\|resource)\b`, … |
| [`testing-and-debugging.md`](references/testing-and-debugging.md) | You write tests for MCP tools or debug capability discovery and registration. | `tests/**/Mcp/**/*Test.php`, `Test/**/Mcp/**/*Test.php`, `debug:mcp`, … |
<!-- routes:end -->

## Hard rules

1. Extend `McpToolResponse`, declare `__invoke(): McpToolResult`, and return
   `$this->successResult()`, `$this->errorResult()`, or `McpToolResult::text()`
   — never legacy JSON strings (`MCP-001`).
2. Put every tool in an explicit `#[McpToolGroup]` and never claim the reserved
   `discovery` group or the `shopware-` name prefix in an extension (`MCP-002`).
3. Tag plugin and third-party bundle services with `shopware.mcp.tool` (not
   `mcp.tool`) and place `#[McpTool]` on the class (`MCP-003`).
4. Write tools default to `bool $dryRun = true` and run previews through
   `executeWithDryRunResult()` (`MCP-004`).
5. Declare `ToolAnnotations` and `#[Schema]` parameter descriptions on
   `#[McpTool]`, and add `#[McpToolDependsOn]` only for genuine prerequisites
   (`MCP-005`).
6. Entity tools validate criteria with `AclCriteriaValidator` and bound
   responses with `McpEntityIncludes` and `JsonEntityEncoder` (`MCP-006`).
7. Serverless app MCP tools target `/api/script/{path}` (never cached
   Store-API scripts) and read POST form `arguments` (`MCP-007`).
8. MCP resources and prompts keep cache hints `private` (never `public`), and
   resource templates use the `mcp.resource_template` DI tag (`MCP-008`).

## Commands

Run in the Shopware checkout through the project's runner (`sw-local-dev`):

```bash
bin/console cache:clear                    # required after editing #[McpTool] or #[Schema] descriptions
bin/console debug:mcp                      # tools of both servers with group, dependencies and privileges
bin/console debug:mcp --scope=api          # Admin API server only (/api/_mcp)
bin/console debug:mcp --scope=store-api    # Store API server only (/store-api/_mcp)
bin/console debug:mcp --native             # prompts, resources, resource templates, and unassigned capabilities
```

## Related skills

- `sw-security` owns MCP tool ACL and privilege enforcement (`SEC-011`).
- `sw-plugin-development` owns plugin DI registration, DAL, and version
  compatibility (`PLG-001`).
- `sw-app-development` owns app `manifest.xml` permissions and Twig app scripts.
- `sw-testing` owns general PHPUnit structure and assertions.

## Already enforced by CI (do not repeat)

<!-- enforced:start: generated from rules/catalog.json by `node tools/bin/render-enforced.ts`; do not edit -->
CI already fails the build on these, so do not repeat them in reviews or
checklists. Flag only what each check misses.
Checks marked *trunk only* are not active in plugin or app projects by
default; there the rule still needs a reviewer.

- `MCP-001` `McpToolResponseRule` (PHPStan, trunk only) reports a class carrying `#[McpTool]` that does not extend `McpToolResponse`. It misses method-level `#[McpTool]` attributes, hand-built error envelopes, and every extension, because the rule ships only in core's PHPStan config; flag those.
- `MCP-001` `McpToolLegacyStringResultRule` (PHPStan, trunk only) reports an MCP tool method whose native return type is `string`, `?string`, a union containing `string`, `mixed`, or missing (including an inherited `__invoke()`). It misses deprecated string helper calls converted inside the method body, and every extension, because the rule ships in `core-rules.neon` only until 6.8.0; flag those.
- `MCP-002` `McpReservedToolGroupRule` (PHPStan, trunk only) reports any non-core MCP tool declaring `#[McpToolGroup('discovery')]` outside unit tests. It misses non-constant group expressions, `shopware-` name prefix collisions in plugins, missing tool groups falling back to `other`, and every extension, because the rule ships only in core's PHPStan config; flag those.
- `MCP-005` `McpToolRegistrationTest::testEveryCoreToolDeclaresAnnotations` (PHPUnit, trunk only) fails when any core MCP tool omits required `ToolAnnotations` hints. It misses plugin tools, incorrect hint values on mutating dry-run tools, missing `#[Schema]` parameter descriptions, and unnecessary `#[McpToolDependsOn]` edges; flag those.
- `MCP-008` `McpCachePolicyConfigTest` (PHPUnit, trunk only) fails when any core MCP server cache policy sets a `public` scope. It misses plugin resources setting public cache hints or headers, and resource templates registered with `mcp.resource` instead of `mcp.resource_template`; flag those.
<!-- enforced:end -->
