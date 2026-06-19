# Skill registry

The catalog of every skill in this repository, its owner, its activation
triggers, and — most importantly — the **topic → owning-skill coverage matrix**.
The coverage matrix is the mechanism that keeps skills from contradicting each
other: every topic has exactly one owning skill. `scripts/validate-skills.sh`
flags duplicate topic ownership and overlapping trigger phrases.

Skills are organised by **target surface** — *what you are editing* — not by
persona. The surface is usually obvious from the path (`src/Core` vs
`custom/plugins` vs `custom/apps`), so the right skill activates by context and
the surface skills can all be installed together without contradicting (see
[Precedence](#precedence-when-more-than-one-applies)).

## Catalog

| Skill | Owner | Surface | Triggers on | Stays quiet for |
| ----- | ----- | ------- | ----------- | --------------- |
| `php-foundation` | maintainer | any PHP | Writing/refactoring PHP for Shopware: types, enums, DTOs, coding style | Non-PHP, generic JS/Vue/Twig-only work |
| `shopware-core-development` | maintainer (platform-controlled) | platform (`shopware/shopware`, `src/`) | Changing platform code: ADRs, release notes (RELEASE_INFO/UPGRADE), deprecations, PHPStan baseline | Plugins, apps, project code |
| `shopware-plugin-development` | maintainer | plugin / project (`custom/plugins`, project `src/`) | PHP extensions on top of Shopware: DAL, services, cache, migrations, decoration, compat | Platform code, declarative apps, generic PHP libraries |
| `shopware-app-development` | maintainer | app (`custom/apps`, `manifest.xml`) | Declarative apps: manifest, permissions, app scripts, webhooks, Admin API | Plugin PHP (DI/DAL/decoration), platform code |
| `shopware-testing` | maintainer | any test | Writing/fixing PHPUnit tests for Shopware code | Storefront E2E/Playwright, Jest, manual QA |
| `shopware-review-learnings` | maintainer + contributors | any review | Reviewing Shopware code, "is this idiomatic", recurring pitfalls | Greenfield generic PHP, non-Shopware review |
| `shopware-research-and-escalation` | maintainer | any | Uncertainty about Shopware behavior/symbols, "should I research", being stuck | Tasks the model is confident about |
| `shopware-pr-description` | maintainer | core PR workflow | Creating/updating shopware/shopware PR bodies, filling the GitHub PR template | Release-note file edits, plugin/app PRs |
| `shopware-assistant-style` | maintainer | any communication | Support ticket replies, short/plain answers, copy-ready customer text | Code rules, PR templates, release notes |
| `shopware-pr-review` | maintainer | PR review threads | Reacting to GitHub review comments, fix vs reply vs push back | Initial PR body, generic idiomatic review |
| `shopware-podman-dev` | maintainer | linked Podman checkout | Running php/composer/phpunit/console/npm in shopware-dev projects | Test structure, PR text, release notes |

## Coverage matrix (one topic → one owning skill)

| Topic | Owning skill |
| ----- | ------------ |
| PHP language baseline (`strict_types`, attributes, `#[\Override]`) | `php-foundation` |
| Type safety (enums over constants, DTOs/VOs over arrays, generics) | `php-foundation` |
| Coding style (PER-CS, import usage, `list<>` over `array<>`) | `php-foundation` |
| Core contribution process (release notes RELEASE_INFO/UPGRADE, ADR, conventional commits) | `shopware-core-development` |
| Deprecation policy (`Feature::triggerDeprecationOrThrow`, `@deprecated tag:`) | `shopware-core-development` |
| Core modernization (Symfony behind feature flags, dual paths until major) | `shopware-core-development` |
| Static-analysis baseline discipline (PHPStan level, shrink-not-delete) | `shopware-core-development` |
| Public-API / `@internal` boundaries | `shopware-core-development` |
| Plugin structure & lifecycle (install/activate/uninstall, keepUserData) | `shopware-plugin-development` |
| DAL usage (Criteria, associations, write/sync, avoid N+1) | `shopware-plugin-development` |
| HTTP cache & cache tags (6.7 `CacheTagCollector`) | `shopware-plugin-development` |
| Database migrations (`MigrationStep`, destructive/non-destructive) | `shopware-plugin-development` |
| Version compatibility (6.6 / 6.7) | `shopware-plugin-development` |
| Symfony-first (HttpClient, Messenger, Validator vs custom code) | `shopware-plugin-development` |
| Service decoration & DI registration | `shopware-plugin-development` |
| App manifest, permissions & lifecycle (`manifest.xml`, `app:install`, requirements) | `shopware-app-development` |
| App scripts (sandboxed Twig hooks in `Resources/scripts/`) | `shopware-app-development` |
| App communication (webhooks, Admin API, registration & signing) | `shopware-app-development` |
| Unit vs integration test placement | `shopware-testing` |
| Integration test wiring (`IntegrationTestBehaviour`, DAL fixtures) | `shopware-testing` |
| Test data, data providers, assertions | `shopware-testing` |
| Recurring review findings (cross-cutting, delta-only) | `shopware-review-learnings` |
| When to research vs proceed; docs map; Context7 | `shopware-research-and-escalation` |
| What to do when stuck (escalation ladder) | `shopware-research-and-escalation` |
| shopware/shopware PR body format (GitHub template, copy-paste output) | `shopware-pr-description` |
| Assistant tone: plain language, concise answers, support-ticket copy blocks | `shopware-assistant-style` |
| Reacting to GitHub PR review comments (fix / reply / push back, confidence %) | `shopware-pr-review` |
| Migration tests, Codecov `#[CoversClass]`, core platform test placement | `shopware-testing` |
| Container execution (Podman/MCP, not host php/composer/phpunit) | `shopware-podman-dev` |
| shopware-dev hub (`~/shopware-dev`, `sw-dev link`, Mutagen, multi-lane proxy) | `shopware-podman-dev` |

### Precedence (when more than one applies)

The surface skills (`shopware-core-development`, `shopware-plugin-development`,
`shopware-app-development`) are **mutually exclusive per task**, not per install:
exactly one matches the surface you are editing. They can all be installed at
once — the descriptions disambiguate on the target (path / artifact), so only
the right one activates. There is no project-level "core vs plugin" choice.

1. **Surface wins.** The target you are editing selects the surface skill
   (`src/Core…` → core; `custom/plugins…` → plugin; `custom/apps` + `manifest.xml`
   → app). If a request is ambiguous, resolve the surface first.
2. Project-local skills override user-global skills (standard tool behavior).
3. A surface skill extends `php-foundation` with stricter deltas, but must state
   any intentional override explicitly — never silently contradict the base.
4. `shopware-review-learnings` records findings; it points at the owning skill
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
| FriendsOfShopware/agent-skills `shopware-phpunit` | Plugin/integration patterns, fixtures, mocks | link in `shopware-testing/references/external-inspiration.md` |
| brocksi.net blog (API-aware guidelines, PHPStan+ECS) | Review learnings + Shopware static analysis | own content |

## Adding a skill or rule

1. Confirm it passes the five inclusion criteria (see [README](README.md#curation--governance)).
2. Assign it to exactly one topic row above (or add a new row — never a second owner).
3. Write the rule in the owning skill, self-contained, in our own words.
4. Add an eval (`evals/tasks/` for behavior, `evals/should-*.md` for activation).
5. Run `./scripts/validate-skills.sh` — it must pass (no conflicts, within budgets).
