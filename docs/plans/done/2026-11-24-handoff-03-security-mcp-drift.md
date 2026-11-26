# Handoff 03: Adopt Shopware 6.7.16.1 Security & MCP PHPStan Rules + Drift Sources

- **Base branch:** `origin/main` (at or after `2e48485f`, post-[#198](https://github.com/BrocksiNet/ai-skills-shopware/pull/198))
- **Suggested branch:** `feat/adopt-shopware-security-mcp-drift`
- **Source issue:** [#199](https://github.com/BrocksiNet/ai-skills-shopware/issues/199) (`Drift: week of 2026-11-23`)
- **Related plan:** [`2026-11-core-sources-and-admin-api.md`](2026-11-core-sources-and-admin-api.md) (see WP A and WP F: `sw-mcp-development`)
- **Parallelizable with:** Handoffs 01 and 02 (rebase and re-run renderers if `REGISTRY.md`, `rules/sources.json`, `rules/catalog.json`, or `skills/sw-skill-router/index.json` change on `main` first)
- **Prerequisite:** Read [`AGENTS.md`](../../../AGENTS.md) and [`2026-11-core-sources-and-admin-api.md`](2026-11-core-sources-and-admin-api.md) (WP F) before editing.

## Goal

1. Track the newly added Shopware ADR (`adr/2026-11-19-remove-claude-md-bridge-files.md`) in `rules/sources.json`.
2. Evaluate and adopt the security-relevant PHPStan rules from Shopware `6.7.16.1` and trunk (`NoXmlUtilsParsingRule`, `ScriptServiceContextPropertyRule`, and the MCP privilege rules) into the owning skills with evals, while respecting WP F's boundary for `sw-mcp-development`.

## Upstream Commits to Inspect

Inspect these commits via `gh api repos/shopware/shopware/commits/<sha>`:

1. **`94180399`** — `chore: merge back 6.7.16.1 (#23115)`
   - **`NoXmlUtilsParsingRule`**: Forbids `Symfony\Component\Config\Util\XmlUtils::parse()` and `loadFile()` in favor of `Shopware\Core\Framework\Util\XmlParser` (hardened XML parsing). Check which Shopware versions ship `XmlParser` (6.6.10.32? 6.7.16.1? 6.8?) so version-compat notes in any plugin rule are accurate.
   - **`ScriptServiceContextPropertyRule`**: Script services must not store `Shopware\Core\Framework\Context` in a property (reusing one context across calls lets a script mutate context for subsequent calls). Inject `Shopware\Core\Framework\Script\AppContextFactory` and call `create()` per method.
2. **`9139f95b`** — `feat(core): add PHPStan rules and an opt-out attribute for MCP tool privileges (#21842)`
   - Added `src/Core/Framework/Mcp/AGENTS.md` and `src/Core/Framework/Mcp/Tool/AGENTS.md`.
   - **`McpAdminToolRequiresPrivilegeRule`**: Admin API MCP tools must declare `#[McpToolRequires]` or explicit `#[McpToolRequiresNoPrivilege]` (not neither, not both; opt-out must not call `requirePrivilege()` / `requirePrivilegeResult()`).
   - **`McpStoreApiToolAdminAclRule`**: Store API MCP tools run in a sales channel context where Admin ACL privileges do not exist; `#[McpToolRequires]` and `requirePrivilege*()` silently pass and give false protection.
3. **`3f723573`** — `feat(framework): report hand-built MCP tool result strings (#22078)`
   - Added `McpToolLegacyStringResultRule` and `src/Core/Framework/Mcp/Command/AGENTS.md`.
4. **`86a0af6b`** — `docs(agents): remove CLAUDE.md bridge files (#23223)`
   - Added `adr/2026-11-19-remove-claude-md-bridge-files.md` superseding the `CLAUDE.md` bridge exception in `adr/2026-06-17-shared-guidance-files-for-humans-and-agents.md`.

## Scope of Changes

### 1. `rules/sources.json`

- Add `adr/2026-11-19-remove-claude-md-bridge-files.md` under the `shopware` source mapped to `["sw-core-development"]`.
- **Check WP F alignment for MCP paths:** [`2026-11-core-sources-and-admin-api.md`](2026-11-core-sources-and-admin-api.md) (WP A step 2 & WP F) planned to map `src/Core/Framework/Mcp/**/AGENTS.md` and `src/Storefront/Mcp/AGENTS.md` to `sw-mcp-development` once that skill is built.
  - Do **not** build the full `sw-mcp-development` skill in this handoff (that is WP F).
  - If you add MCP ACL security rules to `sw-security` now, keep the topic strictly scoped to **MCP tool ACL / privilege boundaries** (which belongs to `sw-security` per `REGISTRY.md`), and note the handoff to WP F for general MCP tool authoring (`McpToolLegacyStringResultRule`, schemas, tags, API index).

### 2. Evaluate and adopt the new rules (following `AGENTS.md` steps 1–8)

For each candidate, check README's five inclusion criteria (delta, value, single home in `REGISTRY.md`, testable, license-clean):

1. **Hardened XML parsing (`NoXmlUtilsParsingRule`) → strong `sw-security` candidate (`SEC-010`)**:
   - Extensions parse XML (manifests, feeds, configs) and frequently do not run Shopware core's internal PHPStan rules.
   - Verify exact `XmlParser` availability across 6.6 / 6.7 / 6.8 before writing version guidance.
   - Add `trunk.enforced_by` pointing at `NoXmlUtilsParsingRule` (`trunk_only: true`).
   - Add a review pair (`review-<name>-catch` / `-ignore`) or behavioral eval with golden `fixtures/pass/` and sneak `fixtures/fail/`.
   - Remember `AGENTS.md`: any rule expected by a review task must live in a reference that `sw-extension-review` borrows (e.g. `skills/sw-security/references/api-acl-and-input.md` or a new routed reference), not only in `SKILL.md`, and check `sw-extension-review/references/lenses.md` for audience alignment.
2. **MCP tool ACL (`McpAdminToolRequiresPrivilegeRule`, `McpStoreApiToolAdminAclRule`) → strong `sw-security` candidate (`SEC-011`)**:
   - Verify in `src/Core/Framework/Mcp/AGENTS.md` whether plugins register Admin/Store API MCP tools.
   - If yes: add a focused ACL rule to `sw-security` (Admin MCP tools declare `#[McpToolRequires]` or explicit `#[McpToolRequiresNoPrivilege]`; Store API MCP tools never rely on Admin ACL privileges), attach `trunk.enforced_by` for both PHPStan rules, and add an eval + golden fixtures.
3. **Script service `Context` property (`ScriptServiceContextPropertyRule`)**:
   - Check if plugins write custom app-script services (`ScriptServiceFactory` / `Facade`).
   - If yes and it passes the 5 criteria: add a rule to `sw-architecture` (next free `ARCH-*`, alongside `ARCH-001` long-running service state) or `sw-plugin-development` (check `REGISTRY.md` single-owner matrix first), with `trunk.enforced_by` and an eval.
   - If core-only: record `ScriptServiceContextPropertyRule` under `trunk.enforced_by` on the appropriate rule or document why skipped in the PR summary.

### 3. Re-render generated files

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
( cd tools && npm run typecheck && npm run lint && npm run format:check && npm test )
bash evals/test-graders.sh
```

## Done Criteria

- `adr/2026-11-19-remove-claude-md-bridge-files.md` is tracked in `rules/sources.json`.
- Every adopted rule has a unique ID in `rules/catalog.json`, accurate `trunk.enforced_by` verified from upstream PHPStan rule source, a single owner in `REGISTRY.md`, activation prompts, and a tested eval with golden pass + almost-pass sneak fail fixtures.
- No overlap or contradiction with WP F (`sw-mcp-development`).
- All deterministic CI checks pass.
