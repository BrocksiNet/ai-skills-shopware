# MCP tool privileges

Scope: who may call a tool and what it checks. Writing tools, schemas and
results is not this reference's topic.

A plugin registers a tool by tagging its service `shopware.mcp.tool`;
Shopware assigns it to the Admin API MCP server, so the Admin ACL applies.
MCP is experimental until 6.8.0.

## Rule

- **SEC-011** **A tool checks its own privileges; the attributes only
  document them.** `#[McpToolRequires]` and `#[McpToolRequiresNoPrivilege]`
  tell operators what a tool needs, in `debug:mcp`, the capabilities API and
  the Administration. Neither grants anything, and neither checks anything
  at runtime. The checks are `requirePrivilegeResult($context, ...)` in
  `__invoke()` (`requirePrivilege()` before 6.7.17) and the ACL check of the
  DAL on repository calls made with the tool's `Context`. A tool that
  reads or writes without a repository, through a DBAL `Connection`,
  `SystemConfigService`, the filesystem or an outgoing request, has no
  privilege check unless it calls one, so every integration or user with the
  tool in its MCP allowlist can use it. Declare the privileges it checks
  with `#[McpToolRequires]`. A tool that needs none declares
  `#[McpToolRequiresNoPrivilege(reason: '...')]`, and never together with
  `#[McpToolRequires]` or a `requirePrivilege*()` call.

## Which cores have what

`#[McpToolRequires]` and `requirePrivilege()` are in 6.7.15.1 and 6.7.16.1.
`#[McpToolRequiresNoPrivilege]`, `requirePrivilegeResult()` and the PHPStan
rule `McpAdminToolRequiresPrivilegeRule` are not in 6.7.16.1; they are on
the 6.7.17.x branch and trunk. `requirePrivilege()` is deprecated for 6.8.

## Common review failures

- A new tool with `#[McpToolRequires('...')]` and a raw query or config read
  but no privilege check in `__invoke()`.
- A tool that declares `#[McpToolRequiresNoPrivilege]` and still checks a
  privilege.
- A hand-built "missing privilege" error: return the result of
  `requirePrivilegeResult()` instead, so clients see one message shape.

## Enforced where

Core's PHPStan rule `McpAdminToolRequiresPrivilegeRule` reports an Admin API
tool with neither attribute or with both, and an opt-out tool that calls
`requirePrivilege()` or `requirePrivilegeResult()`. It never checks that a
`#[McpToolRequires]` tool really calls a check.

## Eval

`review-mcp-tool-privilege-catch` / `-ignore` — a tool that reads a plugin
table through DBAL with only the attribute, and the same tool that calls
`requirePrivilegeResult()` first.
