# Handoff 05: Build `sw-mcp-development` Skill and MCP API Index Surface (WP F)

- **Base branch:** `origin/main` (at or after `a21660c0`, post-v0.19.0)
- **Suggested branch:** `feat/sw-mcp-development`
- **Related plan:** [`2026-11-core-sources-and-admin-api.md`](2026-11-core-sources-and-admin-api.md#wp-f-sw-mcp-development)
- **Parallelizable with:** Handoffs 01, 02, 03, 04, and 06 (rebase and re-run renderers if `REGISTRY.md`, `rules/catalog.json`, `rules/sources.json`, or `skills/sw-skill-router/index.json` change on `main` first)
- **Prerequisite:** Read [`AGENTS.md`](../../AGENTS.md), [`REGISTRY.md`](../../REGISTRY.md), [`2026-11-core-sources-and-admin-api.md`](2026-11-core-sources-and-admin-api.md), and `skills/sw-security/references/mcp-tool-acl.md` before editing.

## Goal

Ship WP F from the accepted November plan: a new **experimental** skill `skills/sw-mcp-development/` for plugins and core contributors authoring Shopware MCP tools, prompts, and resources — wired into drift mining, the public API index, `sw-skill-router`, and `sw-help`, without overlapping `sw-security`'s ownership of MCP ACL/privilege checks (`SEC-011`).

## Upstream Sources to Inspect First

Inspect current `shopware/shopware` `trunk` via `gh api` before authoring any rule:

- `src/Core/Framework/Mcp/**/AGENTS.md` (Tool, Loader, Prompt, Command, Context, Resource)
- `src/Storefront/Mcp/AGENTS.md`
- `src/Core/DevOps/StaticAnalyze/PHPStan/Rules/` — specifically `McpToolLegacyStringResultRule` (added in commit `3f723573` / core PR #22078) and any newer MCP PHPStan rules added since `60c8f1c1`.

## Ownership Boundary (Critical)

- **`sw-security` (`SEC-011`)** already owns **MCP tool ACL and privilege checks** (`#[McpToolRequires]`, `#[McpToolRequiresNoPrivilege]`, `requirePrivilegeResult()`, Store API vs Admin API privilege rules). Do **not** restate `SEC-011` in `sw-mcp-development` — link to `sw-security` and cite `` `SEC-011` `` as a code span.
- **`sw-mcp-development`** owns: registering MCP tools, prompts, and resources in a plugin or core; structured input/output schemas and result objects (no hand-built legacy string results); service tags/attributes/loaders; and testing MCP tools.
- **Out of scope:** running or configuring an MCP server for a shop (runtime question, not code).

## Scope of Changes

### 1. Create `skills/sw-mcp-development/`

- `SKILL.md`: mark **experimental** in the frontmatter description (naming the Shopware version it targets, matching `sw-openapi-dto`'s pattern), keep description `<= 450` chars, include `metadata:` (`contexts: core plugin project`, `tasks: build review`, appropriate `paths` / `routes.json`).
- `references/*.md` + `routes.json`: split rules cleanly into focused references (<= 10 rules each) with specific `paths_any` and `anchors_any` triggers (e.g. `#[McpTool`, `McpTool`, `McpPrompt`, `McpResource`, `**/Mcp/**/*.php`).
- `evals/should-trigger.md` and `evals/should-not-trigger.md`: clear activation prompts, including negatives for running an MCP server, editing plain Store-API routes, and ACL-only questions (`sw-security`).
- Borrow the relevant `sw-mcp-development` reference(s) in `skills/sw-extension-review/routes.json` so extension reviews automatically check plugin MCP tools.

### 2. Catalog, registry, sources, and help

- Add prefix `MCP` to `rules/catalog.json` and tag every rule (`MCP-001..`) with `trunk.source`, `trunk.enforced_by` (e.g. `McpToolLegacyStringResultRule` verified from upstream PHPStan rule source), `audience`, and `eval`.
- Register `sw-mcp-development` in `REGISTRY.md` (catalog table + coverage matrix) and mention it in `skills/sw-help/SKILL.md` (and relevant `use-cases/` docs).
- Map `src/Core/Framework/Mcp/**/AGENTS.md` and `src/Storefront/Mcp/AGENTS.md` (plus any MCP sub-paths found) to `sw-mcp-development` in `rules/sources.json` so weekly drift issues file MCP changes directly under this skill.

### 3. Eval tasks and routing cases

- Add behavioral and/or review-pair evals for each gradable `MCP-*` rule, each with golden `fixtures/pass/`, an almost-pass sneak `fixtures/fail/`, and an explicit `skills` file.
- Add a routing case under `evals/routing/` verifying an MCP tool diff selects `sw-mcp-development` (and `sw-security/references/mcp-tool-acl.md`).

### 4. MCP surface in `tools/api-index/`

- Record MCP extension points (attributes, interfaces, service tags, and public MCP tool base classes) in `tools/api-index/` with unit tests and `api-diff` / `api-facts` support.
- Bump `GENERATOR` in `tools/api-index/src/model.ts` if the snapshot schema/content changes, and run `npm test --prefix tools/api-index` + `npm run bundle:check --prefix tools/api-index`.

### 5. Re-render generated files

```bash
node tools/bin/render-enforced.ts
node tools/bin/render-routes.ts
node tools/bin/render-router-index.ts
```

## Verification

```bash
bash scripts/validate-skills.sh
bash scripts/run-activation-evals.sh
( cd evals/tools/ast && npm test )
( cd tools && npm run typecheck && npm run lint && npm run format:check && npm test && npm test --prefix api-index )
bash evals/test-graders.sh
```

Run a local A/B on the new `MCP-*` tasks (`EVAL_TASKS=... REPEATS=3 bash scripts/eval-local.sh`) and include the table in the PR body.

## Done Criteria

- `sw-mcp-development` passes `validate-skills.sh`, dry activation, golden graders, and local A/B checks.
- No overlap or contradiction with `sw-security` (`SEC-011`).
- `rules/sources.json` tracks core MCP `AGENTS.md` files under `sw-mcp-development`.
- `tools/api-index/` records MCP extension points with passing tests.
