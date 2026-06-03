# Skill registry

The catalog of every skill in this repository, its owner, its activation
triggers, and — most importantly — the **topic → owning-skill coverage matrix**.
The coverage matrix is the mechanism that keeps skills from contradicting each
other: every topic has exactly one owning skill. `scripts/validate-skills.sh`
flags duplicate topic ownership and overlapping trigger phrases.

## Catalog

| Skill | Owner | Profile | Triggers on | Stays quiet for |
| ----- | ----- | ------- | ----------- | --------------- |
| `php-foundation` | maintainer | shared | Writing/refactoring PHP for Shopware: types, enums, DTOs, coding style | Non-PHP, generic JS/Vue/Twig-only work |
| `shopware-core-development` | maintainer (platform-controlled) | core | Contributing to `shopware/shopware`, ADRs, release notes (RELEASE_INFO/UPGRADE), deprecations, PHPStan baseline | Plugin/app/project code, app scripts |
| `shopware-plugin-development` | maintainer | plugin | Building a Shopware plugin/app/project: DAL, services, cache, migrations, compat | Core contributions, generic PHP libraries |
| `shopware-testing` | maintainer | both | Writing/fixing PHPUnit tests for Shopware code | Storefront E2E/Playwright, Jest, manual QA |
| `shopware-review-learnings` | maintainer + contributors | both | Reviewing Shopware code, "is this idiomatic", recurring pitfalls | Greenfield generic PHP, non-Shopware review |
| `shopware-research-and-escalation` | maintainer | both | Uncertainty about Shopware behavior/symbols, "should I research", being stuck | Tasks the model is confident about |

## Coverage matrix (one topic → one owning skill)

| Topic | Owning skill |
| ----- | ------------ |
| PHP language baseline (`strict_types`, attributes, `#[\Override]`) | `php-foundation` |
| Type safety (enums over constants, DTOs/VOs over arrays, generics) | `php-foundation` |
| Coding style (PER-CS, import usage, `list<>` over `array<>`) | `php-foundation` |
| Core contribution process (release notes RELEASE_INFO/UPGRADE, ADR, conventional commits) | `shopware-core-development` |
| Deprecation policy (`Feature::triggerDeprecationOrThrow`, `@deprecated tag:`) | `shopware-core-development` |
| Static-analysis baseline discipline (PHPStan level, shrink-not-delete) | `shopware-core-development` |
| Public-API / `@internal` boundaries | `shopware-core-development` |
| Plugin structure & lifecycle (install/activate/uninstall, keepUserData) | `shopware-plugin-development` |
| DAL usage (Criteria, associations, write/sync, avoid N+1) | `shopware-plugin-development` |
| HTTP cache & cache tags (6.7 `CacheTagCollector`) | `shopware-plugin-development` |
| Database migrations (`MigrationStep`, destructive/non-destructive) | `shopware-plugin-development` |
| Version compatibility (6.6 / 6.7) | `shopware-plugin-development` |
| Service decoration & DI registration | `shopware-plugin-development` |
| Unit vs integration test placement | `shopware-testing` |
| Integration test wiring (`IntegrationTestBehaviour`, DAL fixtures) | `shopware-testing` |
| Test data, data providers, assertions | `shopware-testing` |
| Recurring review findings (cross-cutting, delta-only) | `shopware-review-learnings` |
| When to research vs proceed; docs map; Context7 | `shopware-research-and-escalation` |
| What to do when stuck (escalation ladder) | `shopware-research-and-escalation` |

### Precedence (when more than one applies)

1. Project-local skills override user-global skills (standard tool behavior).
2. A profile skill (`core`/`plugin`) may extend `php-foundation` with stricter
   deltas, but must state any intentional override explicitly — never silently
   contradict the base.
3. `shopware-review-learnings` records findings; it points at the owning skill
   rather than re-defining a topic.

## Sources behind the seed (rewritten, not copied)

| Source | Role | License note |
| ------ | ---- | ------------ |
| Shopware `coding-guidelines/core/` + `ecs.php` + `shopwarelabs/phpstan-shopware` | Primary PHP/static-analysis anchor | MIT |
| `shopwareLabs/ai-coding-tools` | Testing rules + enforcement tooling (MCP) | MIT (depend/link) |
| `bartundmett/skills` shopware6/rules | Granular rule inspiration (DAL, admin, storefront…) | rewrite |
| `biotech-shopware/claude-shopware-skill` | Skill shape + source policy + docs-map idea | model-after |
| `netresearch/php-modernization-skill` | PHP 8.x modernization patterns + guardrail idea | CC-BY-SA → rewrite |
| LambdaTest phpunit-skill / mcpmarket php-testing-standards | Generic PHPUnit patterns | rewrite |
| brocksi.net blog (API-aware guidelines, PHPStan+ECS) | Review learnings + Shopware static analysis | own content |

## Adding a skill or rule

1. Confirm it passes the five inclusion criteria (see [README](README.md#curation--governance)).
2. Assign it to exactly one topic row above (or add a new row — never a second owner).
3. Write the rule in the owning skill, self-contained, in our own words.
4. Add an eval (`evals/tasks/` for behavior, `evals/should-*.md` for activation).
5. Run `./scripts/validate-skills.sh` — it must pass (no conflicts, within budgets).
