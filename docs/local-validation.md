# Local validation on a real Shopware instance (dogfooding)

The automated eval suite proves the skills change model output in fixtures. This
guide is the **human-in-the-loop** counterpart: install a profile in your own
IDE, point it at a **real local Shopware instance**, run real tasks, and judge
the result with the project's own tooling — not by guessing. Findings here feed
new entries into `shopware-review-learnings` and new `evals/tasks/`.

You should be able to follow this end-to-end on your own machine.

## 1. Prerequisites

- A local Shopware 6 instance you can run and that has its dev tooling
  (`composer`, `vendor/bin/phpunit`, `vendor/bin/phpstan`, ECS) — e.g. a
  symfony-flex/`dockware` setup or your usual local dev environment.
- One agent: Cursor, Claude Code, Codex, or OpenCode, with Node.js for `npx`.
- Optional but recommended: the
  [`shopwareLabs/ai-coding-tools`](https://github.com/shopwareLabs/ai-coding-tools)
  dev-tooling MCP so the agent can run PHPStan/ECS/PHPUnit itself.

## 2. Install a profile

Pick the profile that matches the instance (plugin/app project vs. core checkout):

```bash
# Plugin / app / project (most common) — into the current project
npx skills add BrocksiNet/ai-skills-shopware \
  --skill php-foundation \
  --skill shopware-plugin-development \
  --skill shopware-testing \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  -a cursor    # or -a claude-code / -a codex / -a opencode
```

Confirm the skills landed in the tool's skills directory (e.g. `.cursor/skills/`,
`~/.claude/skills/`, `~/.codex/skills/`, `.opencode/skills/`) and that the agent
lists them.

## 3. Run representative tasks against the real instance

Open the agent in the instance and try tasks that exercise the rules. Suggested
set (adapt to your codebase):

1. **Cache tag (6.7):** "Add a cache tag to this product loader and invalidate it
   when the product changes." → expect `CacheTagCollector::addTag()`, no
   deprecated `*CacheTagsEvent`.
2. **DAL read:** "Load products filtered by manufacturer name." → expect
   `addAssociation('manufacturer')` before the filter; sales-channel context for
   storefront reads.
3. **DTO refactor:** "Refactor this array payload into a typed DTO." → expect a
   `readonly` DTO, no known-shape `array`.
4. **Unit test:** "Generate a unit test for this service." → expect a true unit
   test (`TestCase`, mocks, no kernel/DB), `assertSame`, data providers.
5. **Migration:** "Add a column via a migration." → expect `MigrationStep`,
   destructive/non-destructive split, idempotent.

## 4. Verify with the project's own tooling (real pass/fail)

Run the instance's checks on the generated code — this is the truth, not vibes:

```bash
vendor/bin/phpstan analyse <changed paths>
vendor/bin/ecs check <changed paths>      # or the project's ECS command
vendor/bin/phpunit <new/changed tests>
```

Or ask the agent to run them via the dev-tooling MCP and report results.

## 5. A/B by hand

Disable the skills (uninstall the profile, or temporarily move the skills dir)
and run the **same** task on a clean copy. Compare:

- Did the skill-on version avoid a mistake the skill-off version made?
- Did it produce code that passes PHPStan/ECS/PHPUnit on the first try?

If there is no difference, the rule may not be earning its context budget — note
it.

## 6. Send feedback (closes the loop)

Open an issue using a template so your finding becomes a rule + an eval:

- **Rule miss** — the agent did the wrong thing the skill should have prevented.
- **False trigger** — a skill fired when it should have stayed quiet (or gave
  noisy/irrelevant guidance).
- **Improvement** — a better rule, reference, or trigger phrasing.

Each accepted finding becomes a line in `shopware-review-learnings` (or the
owning skill) and a new `evals/tasks/<rule>/` so the regression is caught
automatically next time.

## Quick checklist

- [ ] Profile installed and visible to the agent.
- [ ] Ran ≥3 representative tasks against a real instance.
- [ ] Verified output with PHPStan + ECS + PHPUnit (or dev-tooling MCP).
- [ ] A/B'd at least one task with the skill off.
- [ ] Filed an issue for anything that missed or misfired.
