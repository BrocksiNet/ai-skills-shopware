# Skill maintenance — November 4, 2026

Consolidate duplicate rules before deleting skills. This pass keeps all **20
skills**, reduces active rule IDs from **226 to 222**, updates two existing
rules, and publishes no new rule. The machine-readable
[evidence record](skill-maintenance-2026-11-04.json) contains the PR inventory,
review links, source commits and per-skill decisions.

## What was reviewed

The window is **October 14–November 4, 2026**, for public
`shopware/shopware` PRs merged into `trunk`:

- 321 merged PRs inventoried across four complete search pages.
- 262 substantive inline comments from 97 of those PRs, excluding replies,
  bots, the PR author and short comments.
- Complete PR snapshots for 12 selected changes and diffs for 27 commits
  touching the watched guidance, static checks and PR template.

This is not a full review of all 321 diffs. The inline API was queried by
update date, so older unchanged threads can be absent. Private
`SwagCommercial` reviews and other upstream skill repositories were outside
this pass. Comments are leads; their frequency does not establish model benefit.

## Consolidations applied

| Duplicate ID removed from guidance | Canonical owner retained | Obligation |
| --- | --- | --- |
| `REV-008` | `PLG-007` | Cache-tag API migration |
| `REV-013` | `TEST-008` | Cross-test docblocks |
| `REV-014` | `TEST-015` | Safeguard test placement |
| `REV-024` | `PLG-003` | DAL instead of ordinary entity SQL |

Each pair has the same audience and eval. Catalog entries retain the old IDs
as `superseded`, and review guidance points to the canonical owner. The
extension-review lenses and raw-SQL near-miss grader use the surviving IDs.
Existing behavioral tasks remain. This proves ownership consistency and keeps
the existing contracts checked; it is not measured model non-inferiority.

Sharing an eval is only a duplicate-finding heuristic. For example, `PLG-002`
is a general deprecation obligation while `PLG-007` names a particular cache
API. `REV-009` also covers core, unlike plugin-only guidance. Those were not
merged just because they share a task.

## Existing rules updated from trunk

| Rule | Change | Evidence |
| --- | --- | --- |
| `ARCH-001` | Distinguish registering a resettable service from the installed HTTP kernel actually invoking resets. The new 6.7 path requires `LONGRUNNING_ENVIRONMENT`; do not assume every installed 6.7 release contains it. Added catch/ignore cases with an explicit installed-kernel contract. | [Service reset change](https://github.com/shopware/shopware/pull/19121) |
| `TEST-014` | Record trunk's new annotation check and its exceptions. Avoid reporting what that check already catches; keep plugin guidance because core test rules are not enabled there by default. | [PHPStan check](https://github.com/shopware/shopware/pull/22266), [recurring review](https://github.com/shopware/shopware/pull/22258#discussion_r4415917827) |

The miner previously watched neither root nor Administration `AGENTS.md`.
Adding the paths alone would still miss paragraph-only requirements. The
extractor now reads their changed prose, excludes fenced examples, and reports
missing patches. Replaying the 27 collected commits yields **408 signals
instead of 357**, recovering **51 prose changes**, including the
[snippet convention](https://github.com/shopware/shopware/pull/21858).
These are triage leads, not 51 rules. Tests cover extraction and delivery into
the author-facing report. Historical API recordings retain their original
query scope instead of inventing responses for newly watched paths.
The mining cursor was not advanced.

## A candidate rejected by development screening

The [theme-message review](https://github.com/shopware/shopware/pull/21779#discussion_r4348458773)
found a real bug: a nonstandard accessor caused a queued flag to disappear
through Shopware's configured JSON serializer. A direct handler test missed it.

Candidate `ARCH-006` described the transport boundary and a round-trip test.
Before model calls, a small development protocol required a genuine baseline
miss, reliable catches with guidance, and no clean-case failures. It ran 12
read-only sessions with reported model `claude-haiku-5-5`, two per arm and case:

| Case | Skills off: original grade | Candidate on: original grade |
| --- | --- | --- |
| Faulty getter | 1/2 | 2/2 |
| Supported getter | 0/2 | 0/2 |
| Configured custom normalizer | 2/2 | 2/2 |

The nominal catch improvement is misleading. **Both baseline answers found
the serialization bug.** One failed because it also questioned the default
value, whose business justification was unspecified. The supported-getter
case also lacked the round-trip test required by the candidate, so a finding
about that missing test was legitimate. This family cannot establish benefit,
harm or equivalence. The normalizer control also hit a ceiling.

The candidate therefore stays unpublished; its ID is reserved in the catalog.
All original grades remain in the
[screen record](../evals/experiments/queue-screen-2026-11-04.json), alongside
the evaluated inputs, protocol, provenance hashes and trace observations.
Hashes were verified after every session had finished. The CLI reported
$0.04984213 in usage; that is not an invoice. Skills loaded in all six on-arm
sessions, but the reference observer confirmed the expected file in only two.
No skill loads were reported in the off arm. Fresh workdirs do not isolate
the entire host filesystem, so this is not strong package-isolation evidence.

After the screen, the three tasks gained explicit legacy-default and accessor
contracts; the clean cases gained a transport round-trip test. They are now
regression cases. They were not rerun to replace the original scores and must
not be presented as fresh holdouts.

## Highest-value candidates for the next eval set

| Topic and owner | What the evidence suggests | Evidence |
| --- | --- | --- |
| Sensitive data — `sw-security` | Follow tokens through queue payloads, mail bodies, template sample data and exception logs. Check ordinary-mail behavior too. Establish released availability before recommending the new `SensitiveMail` API. | [Queue payload](https://github.com/shopware/shopware/pull/21783), [mail logging](https://github.com/shopware/shopware/pull/22122) |
| Rate-limit identity — `sw-security` | Use the same identity equivalence as authentication, including case and trimming, without combining different principals. | [Login keys](https://github.com/shopware/shopware/pull/22226), [MCP counters](https://github.com/shopware/shopware/pull/22282) |
| UI workflow tests — `sw-admin-js` | A method invoked on a hand-built `this` misses rendered failure output; async mocks can leave the relevant UI unmounted. Test through mounted components and deferred responses before reviving a generic testing rule. | [Bulk failures](https://github.com/shopware/shopware/pull/19985#discussion_r4434410159), [currency race](https://github.com/shopware/shopware/pull/22270#discussion_r4421088123) |
| Work budgets — existing `ARCH-002` | A limit per query does not bound thousands of pages inside one HTTP request. Refine the current rule only if a workflow eval exposes that gap. | [Bulk assignment](https://github.com/shopware/shopware/pull/21801) |
| Snippets — `sw-admin-js` | Check the documented two-form convention and the distinct-zero exception. Confirm a model miss before adding another style rule. | [Upstream guidance](https://github.com/shopware/shopware/pull/21858) |

The Administration lint gate, complexity limits, escape-hatch checks and
Fallow belong primarily to deterministic checks and trunk documentation.
Do not turn each new check into another reviewer instruction. Existing
`ADM-007` already records the no-new-mixins check. Core-only enforcement is
not grounds to delete guidance needed by extensions.

## Which skills to consolidate next

| Group | Decision |
| --- | --- |
| Core, OpenAPI DTO, plugin, app, Administration, storefront, security | Keep distinct surface and contract ownership. |
| Architecture, testing, change impact, review learnings, extension review | Keep the workflows; remove repeated rule definitions as demonstrated above. |
| Help and router | Keep the 19-skill merged package as an experiment. Earlier selection and transfer screens do not prove equivalent code outcomes. |
| PHP foundation, research, Podman execution | Keep shared capabilities separate from surface-specific guidance. |
| PR description, PR review, assistant style | Keep their current scopes. Test a workflow-specific install profile before merging or deleting communication guidance. |

## Make the next comparison decisive

Use development tasks to find ambiguous contracts, weak graders and ceiling
cases. Then freeze **fresh task families**, packages, model profiles and a
decision rule. The development cases above cannot supply that independent set.

Measure defect detection, false findings, code outcomes, reference-fact
retrieval and cost separately. Verify the relevant fact was returned, rather
than counting a skill invocation or file path. Expose only the assigned skill
package. Include clean twins and idiomatic alternate implementations.

For a new rule, require an actual baseline mistake on the targeted contract
and a clean-case check. For a packaging removal, predeclare a practical
regression margin and require the uncertainty bound to fit within it; failing
to find a significant difference is not equivalence. Treat related PRs and
repeated attempts as correlated evidence. Task families, rather than retry
counts, determine how much independent evidence exists. Keep a package when
the comparison remains underpowered.

An alias with identical obligations can be consolidated by checking ownership,
audiences and callers. A check can replace guidance only for audiences that
actually run it. Those decisions need different evidence from deleting a
domain skill.

## Validation

Passed 537 tooling tests, 41 AST tests and 662 golden cases across 227 tasks,
plus strict typecheck, lint, formatting, Markdown lint, skill validation, dry
activation and the skill-creator validator for the four updated entrypoints.
All five new review patches apply to their supplied context. GitHub CI was not
dispatched; no issues, comments, PRs or mining cursors were changed remotely.
