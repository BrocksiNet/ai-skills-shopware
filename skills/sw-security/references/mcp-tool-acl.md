# MCP tool privileges

Scope: who may call a tool and what it checks. Writing tools, schemas and
results is not this reference's topic.

A plugin registers an Admin API tool by tagging its service `shopware.mcp.tool`;
Shopware assigns it to the Admin API MCP server, so the Admin ACL applies.
Store API tools are tagged `shopware.store_api_mcp.tool` and run in a sales
channel context, where Admin ACL privileges do not exist. MCP is experimental
until 6.8.0.

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
  `#[McpToolRequires]` or a `requirePrivilege*()` call. On a Store API tool,
  never declare `#[McpToolRequires]` or call `requirePrivilege*()` — Admin
  ACL privileges always pass outside an Admin API context, so protect Store
  API tools through the sales channel context and Store API routes instead;
  a tool registered on both servers can only declare
  `#[McpToolRequiresNoPrivilege]`.

## Which cores have what

`#[McpToolRequires]` and `requirePrivilege()` are in 6.7.15.1 and 6.7.16.1.
`#[McpToolRequiresNoPrivilege]`, `requirePrivilegeResult()`,
`McpAdminToolRequiresPrivilegeRule` and `McpStoreApiToolAdminAclRule` are
not in 6.7.16.1; they are on the 6.7.17.x branch and trunk.
`requirePrivilege()` is deprecated for 6.8.

## Common review failures

- A new tool with `#[McpToolRequires('...')]` and a raw query or config read
  but no privilege check in `__invoke()`.
- A tool that declares `#[McpToolRequiresNoPrivilege]` and still checks a
  privilege.
- A Store API tool (`shopware.store_api_mcp.tool`) that declares
  `#[McpToolRequires]` or calls `requirePrivilegeResult()`, giving a false
  sense of Admin ACL protection.
- A hand-built "missing privilege" error: return the result of
  `requirePrivilegeResult()` instead, so clients see one message shape.

## Enforced where

Core's PHPStan rules `McpAdminToolRequiresPrivilegeRule` and
`McpStoreApiToolAdminAclRule` report:
- an Admin API tool with neither attribute or with both, and an opt-out
  tool that calls `requirePrivilege()` or `requirePrivilegeResult()`,
- a Store API tool that declares `#[McpToolRequires]` or calls
  `requirePrivilege()` or `requirePrivilegeResult()` in its own class.

Neither rule checks that a `#[McpToolRequires]` Admin API tool really calls
a privilege check.

## Eval

`review-mcp-tool-privilege-catch` / `-ignore` — a tool that reads a plugin
table through DBAL with only the attribute, and the same tool that calls
`requirePrivilegeResult()` first.
