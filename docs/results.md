# Results

What the evals have shown so far, including where the skills did not help.
Behavioral scores use scripted graders. A/B runs compare the same task with
skills on and off; the packaging experiments compare three skill configurations.
Method: [`architecture.md`](architecture.md#how-a-rule-is-proven).
Detail and history: the plans in [`plans/`](plans/) and the
[changelog](../CHANGELOG.md).

Detailed historical JSON is available through the
[evidence archive](evidence.md), with per-record hashes and pinned originals.

## Where the skills change the answer

The skills win where the answer is a Shopware fact the model cannot know: an
API that changed in 6.7, an event that is no longer dispatched, a method that
arrived in a later minor release.

Claude Haiku, three runs per arm:

| Rule | The planted problem | Skills off | Skills on |
| ---- | ------------------- | ---------- | --------- |
| `ADM-044` | One bundle for 6.5 and 6.6+ that binds `sw-*` form fields the old way | 0/3 | 3/3 |
| `PLG-007` | A 6.7 subscriber to a `*CacheTagsEvent` that core no longer dispatches | 0/3 | 3/3 |
| `SF-009` | A storefront form that still uses `sw_csrf` | 0/3 | 3/3 |
| `ADM-009` | A new `webpack.config.js` where the Administration builds with Vite | 0/3 | 2/3 |

No `-ignore` task got more false findings with the skills on.

## Version facts beat rules alone

Three review pairs use Shopware API that no skill names, so the skill cannot
already know the answer. The third arm adds `api-facts` from the public API
index. Claude Haiku, five runs per arm:

| Task | Skills off | Skills on | Skills on plus facts |
| ---- | ---------- | --------- | -------------------- |
| A guard on a class whose method came later | 0/5 | 1/5 | 5/5 |
| A method from 6.7.1.0 under a `~6.7.0` constraint | 0/5 | 0/5 | 5/5 |
| A guard on an event every supported release has | 0/5 | 4/5 | 5/5 |
| The three clean twins, no finding allowed | 14/15 | 13/15 | 15/15 |

With facts, every catch passes and the false findings disappear. Rules alone
catch 5 of 15.

`api-diff` measured against the breaks named in the 6.6, 6.7 and 6.8
UPGRADE files:

| Measure | Value |
| ------- | ----- |
| Recall | 97.2 % |
| Precision | 97.1 % |

## The gate catches a bad rule

A deliberately wrong rule in `sw-plugin-development` turned the
`prepare-plugin-for-6-8` task from 3/3 to 0/3, and the eval gate went red. A
rule that makes the model worse cannot ship unnoticed.

## Where they did not help, and what changed

- **Easy catches.** On the first six review catch tasks, Haiku found the
  planted problem with and without the skills. Those tasks prove nothing, so
  new catch tasks are built around facts the model lacks.
- **Rule IDs.** A real plugin review with the skill had no false finding, but
  only 3 of 12 cited rule IDs fit. Near-miss tasks now fail a review that
  cites a plausible but wrong rule.
- **Context cost.** Loading references by diff instead of all at once cost no
  measurable tokens on `prepare-plugin-for-6-8`: plus 1.3 %, inside the
  noise. It did not save tokens on that task either.
- **Free CI models** often ignore skills. The gate fails a run when skills do
  not load, or leak into the skills-off arm.

## What is covered

| Measure | Count |
| ------- | ----- |
| Active rules with an ID | 222 |
| Rules with an eval task | 111 |
| Eval tasks | 227 |
| Review tasks (catch, ignore and near-miss) | 146 |
| Routing cases | 15 |

Rules without an eval record why in the catalog, usually a process or style
rule that core's own CI already enforces. They are the visible backlog.

## Discovery consolidation screen — November 4, 2026

An isolated pilot compares the current 20-skill library, a 19-skill package
that merges help into the router, and an 18-skill package with both discovery
entry points removed. The published skills are unchanged. Claude Haiku,
one trial on each of three skill-selection tasks:

| Packaging | Passed |
| --------- | ------ |
| Current | 3/3 |
| Router/help merged | 3/3 |
| Router/help removed | 3/3 |

The merged router also preserves selections on all 15 recorded routing cases.
This is a ceiling on a small selection screen, not evidence to retire either
skill or a proof that consolidation preserves implementation quality. The
plugin-review task did not load a skill through the reported skill tool in
any arm. The transfer comparison below follows up with prospective reference-retrieval
and code tasks; additional model profiles remain outstanding.

The [screening record](evidence.md#skill-experiments) includes
package hashes, trial outcomes, selections, skill loads and token use.
[Running the pilot](../evals/README.md#routerhelp-consolidation-pilot) prepares
fresh packages outside the checkout. Exploratory runs with an unstated
selection limit and packages inside this checkout were discarded before this
screen; their apparent onboarding difference did not survive the correction.

## Reference retrieval and code transfer — November 4, 2026

The same frozen packages ran on four newly authored tasks, two repeats per arm,
using Claude (reported model `claude-haiku-5-5`). Inputs, package hashes, limits
and shuffled within-task trial order were recorded before the first session;
task, grader and package hashes were verified unchanged after all 24 sessions.
Every session advertised the intended library skills (20 / 19 / 18).

One task was invalidated: cancellation. The fixture and prompt did not establish
which teardown method its host calls, but the oracle assumed `destroy()` and
supplied a base method absent from the
[pinned Shopware base](https://github.com/shopware/shopware/blob/v6.7.0.0/src/Storefront/Resources/app/storefront/src/plugin-system/plugin.class.js).
Two generated answers chose `_destroy()` and failed that assumed contract.
Those six trials are retained as diagnostic data, excluded from packaging
conclusions, and the task is removed from the active comparison. It was not
repaired and rerun as a fresh holdout.

The remaining three task families cover zero-safe option compatibility,
inherited Administration save behavior, and a PHP service reset with its
memoization preserved:

| Packaging | Code outcomes | Confirmed expected-reference reads |
| --------- | ------------- | ---------------------------------- |
| Current | 6/6 | 0/6 |
| Router/help merged | 6/6 | 0/6 |
| Router/help removed | 6/6 | 0/6 |

The Administration skill was invoked in all six save trials, but its expected
extension reference was not read. Each arm read one other reference. These
reads are recorded, not automatically scored as mistakes. Successful `Read`
results and complete-reference shell reads count; partial shell excerpts may be
missed. A citation or listing does not count as retrieval.

**Decision: leave published skills unchanged.** The valid code tasks hit a
ceiling, while retrieval did not reach the targeted references. This is no
basis for declaring a skill redundant or the merge equivalent. The next
independent holdouts should depend on specific, locally documented Shopware
facts and include reference-retrieval controls, then run on another supported
model profile. More repeats of these same easy tasks would not repair the
lack of discrimination.

The JavaScript checks execute edited modules in a fixture VM; PHP checks AST
and service configuration, not a running Shopware container. The cases were
prospectively authored here, not independently curated, and are now regression
data. The [full record](evidence.md#skill-experiments)
contains the frozen manifest, prompts, per-trial retrieval/code/usage data,
invalidated task inputs and failing answers. Raw events, exact evaluated
sources and edited fixtures remain locally under
`evals/.results/transfer-20261104-haiku/`. The
[runner instructions](../evals/README.md#prospective-reference-and-code-transfer-comparison)
describe how to reproduce the retained comparison.

## Fact-sensitive transfer across three models — November 4, 2026

**Decision: keep published skills unchanged.** The comparison now includes
Haiku, Sonnet and Opus (reported IDs `claude-haiku-5-5`,
`claude-sonnet-5-5`, `claude-opus-5-5`). It tests only the router/help packaging
change: 20 published skills, 19 with help merged into the router, or 18 with
both removed. It does not test removing domain rules.

All three profiles, packages, prompts, grader sources and dependency locks were
frozen before the first session. Live read controls succeeded on every model.
The schedule planned 54 serial sessions; 34 started, with 32 graded outcomes,
two infrastructure errors and 20 skipped trials under the frozen stop rule.
No budget or turn caps were hit. The CLI reported $4.07 for task sessions,
excluding controls and preflights; that is reported usage, not an invoice.

Only two task families support the packaging comparison: the cache API's minor
version floor and an Administration caption binding across Vue versions.
Sonnet and Opus completed balanced trials on both:

| Packaging | Sonnet code outcomes | Opus code outcomes |
| --------- | -------------------- | ------------------ |
| Current | 4/4 | 4/4 |
| Router/help merged | 4/4 | 4/4 |
| Router/help removed | 3/4 | 4/4 |

The single valid code failure chose the right documented binding but omitted
whitespace before the following attribute. The actual Vue 3 compiler rejected
the template. One formatting mistake is insufficient evidence that removing
discovery skills harms outcomes, and the remaining passes do not prove
non-inferiority. Haiku supplied two cache passes before its third session hit
the deadline; its incomplete arms are diagnostic rather than pooled evidence.
One Haiku trial read another installed skill copy, so it cannot establish
retrieval from its assigned package.

### Retrieval measurement

These prompts explicitly asked agents to check installed guidance and relevant
references, without naming the file or required API. They measure retrieval
when requested, not natural activation. Comparing their read rates with the
older unprompted tasks would confound prompt and task changes with packaging.

The frozen observer confirmed expected-reference content in 8/12 Sonnet and
7/12 Opus trials on the two valid families. It required complete reference
output for Bash, and therefore missed partial shell reads. A separately
labelled, post-hoc content audit found the target fact text returned from the
assigned package before edits in 11/12 Sonnet and 12/12 Opus trials. The raw
primary counts remain unchanged. Neither metric proves that a read caused the
fix. A reference-file read also does not guarantee its relevant section was
returned.

### Excluded ACL case and regression repairs

The ACL case is excluded across **all packages and models**. Its oracle tested
stored roles with a lone editor/creator/deleter key, but the task never made
missing dependency keys an explicit precondition. Shopware's
[privilege expansion](https://github.com/shopware/shopware/blob/v6.7.0.0/src/Administration/Resources/app/administration/src/app/service/privileges.service.ts)
and [role-save workflow](https://github.com/shopware/shopware/blob/v6.7.0.0/src/Administration/Resources/app/administration/src/module/sw-users-permissions/page/sw-users-permissions-role-detail/index.js)
include inherited feature keys in persisted roles. Mapping each existing key
to its own new capability can therefore satisfy the normal workflow. The task
also described a released feature without declaring its migration stub
unshipped, yet required preserving migration identity. These ambiguities make
the six Sonnet migration failures unsuitable for a packaging conclusion.
Opus used a class constant for its migration map, which the bounded PHP AST
evaluator correctly reported as ungradable instead of a code failure.

After the frozen run finished, the ACL regression task gained explicit stored
role snapshots and an unshipped-migration precondition. Its oracle now checks
the normal expanded-key workflow and supports class constants. Literal shell
excerpts now count as reference reads only with a recognized file-read command,
an explicit reference operand and matching returned source text; path echoes,
listings and failed calls remain rejected. The Claude adapter also bounds CLI
cleanup after a terminal result: Haiku had already emitted a successful result
but its process did not exit before the outer deadline. Protocol errors and
immediate crashes remain errors. These are regression repairs, not repaired
scores or new held-out trials.

### What this changes about the next decision

The next comparison needs an environment that exposes only the assigned skill
package; this runner's fresh workdirs do not isolate the rest of the filesystem.
Contract fixtures should include persisted inputs and lifecycle preconditions,
and graders should accept idiomatic rewrites before any model sees the tasks.
Use a separate development set to reject ceiling tasks, then freeze fresh
independent task families. Predeclare a practical regression margin and a
paired decision rule; count task families as the independent evidence, rather
than treating repeated attempts as unrelated tasks. Reference reads, usable
completion, code correctness and cost should remain separate outcomes.

The [full record](evidence.md#skill-experiments) retains
the original protocol, all 54 scheduled rows, prompts, primary and diagnostic
metrics, exclusions, failing template, original ACL oracle and source audit.
Exact frozen inputs, raw traces and edited code remain locally in
`evals/.results/facts-20261104-multimodel/`. The active cases are now regression
data; the corrected ACL implementation must not be presented as an unseen
confirmation of the original result.

## Maintenance from recent trunk and reviews — November 4, 2026

A public-core pass inventoried 321 merged PRs over October 14–November 4 and
screened 262 substantive inline comments from 97 PRs. Four duplicate review
rule IDs were consolidated into their canonical testing/plugin owners. All
20 skills remain; active rule IDs fall from 226 to 222. Existing service-reset
and static-repository guidance was updated. Root and Administration `AGENTS.md`
are now mined, including paragraph-only changes.

A 12-session development screen did not justify publishing a queue-serialization
rule. Both baseline answers detected the bug; the nominal catch-grade difference
came from an additional finding about an underspecified default. A clean fixture
also lacked a test required by the candidate. Original scores remain unchanged;
repaired cases are regression data. No new rule or skill was published.

The [maintenance report](skill-maintenance-2026-11-04.md) records the applied
consolidations, source links, remaining candidates, evidence limits and the next
decision method. The [screen record](evidence.md#skill-experiments)
retains the original protocol, evaluated inputs, hashes and all trial outcomes.

## Sensitive-mail development screen — November 4, 2026

**Keep the published skills unchanged.** Eight read-only reviews exposed no
target defect miss or clean-case false positive with the current package.
The prospective stop rule therefore ended the screen before candidate runs.

The cases use the installed source from
[core PR #22122](https://github.com/shopware/shopware/pull/22122), pinned to
merge `e41e3f3`. They revert the sensitive-data guard on template sample
persistence or on failed-mail exception/trace logging, with behavior-preserving
clean controls. This target includes the new mail helpers; it does not establish
their availability in every released 6.7 version.

| Current package; one attempt per model and case | Haiku | Sonnet |
| --- | --- | --- |
| Template-sample leak detected | Yes | Yes |
| Failure-log leak detected | Yes | Yes |
| Safe sample change accepted | Yes | Yes |
| Safe failure-log change accepted | Yes | Yes |

Source-audited outcomes are **4/4 defect detections and 4/4 clean reviews**.
The original automatic grade remains **7/8**: Haiku also identified the
always-true `getError() !== null` check, which the strict catch oracle rejected
as an unexpected finding. The pinned checkout requires Symfony Mailer
`~7.4.12`; its
[`getError(): Throwable`](https://github.com/symfony/mailer/blob/v7.4.12/Event/FailedMessageEvent.php)
confirms that secondary observation. No raw score was overwritten, and no rule
was added to compensate for a grader mismatch.

Neither model invoked a skill or read the expected reference in any session.
The source was enough for these reviews. The CLI also advertised builtin
skills, although none were invoked and observed file accesses stayed inside
the fixture. This is neither a package-isolation proof nor evidence that
`sw-security` is redundant.

These are source-cued, one-line guard mutations from two fault families in
one PR. They are consumed development data, with no executed PHP or generated
code outcome measurement. A rule change still needs a genuine baseline mistake
and independent implementation tasks; these cases cannot supply that holdout.

The [compact record](../evals/experiments/security-mail-screen-v1.json) links
the local archive of frozen inputs, untested candidate, original grades,
traces, retained workdirs, source audit and replay instructions. Detailed JSON
and source snapshots stay out of tracked files. The archive is retained under
`evals/.results/`; it is not published with this report.

## Admin form-binding decision — November 4, 2026

**Keep `ADM-044` for mixed-version plugin forms and correct its explanation.**
This is a narrow engineering recommendation from source-audited exploratory
evidence. The original prospective retention gate was not met.

The [focused protocol](../evals/experiments/admin-binding-v1.json) compared
the unchanged Admin skill with the same package minus only the `ADM-044`
paragraph. Both arms were asked to read the architecture reference.
The measured current package is pinned to `d81bd6f`, before the wording
correction and entrypoint reminder; neither change was in the model runs.
The two new tasks asked for a mail-profile editor and a two-step label wizard
in standalone plugin repositories without vendored Administration sources.
Every answer ran on Vue 2.7.14 and Vue 3.3.4, using unchanged Shopware
6.5.8.0 / 6.6.0.0 field handlers in a reduced visual shell. The DOM was
jsdom; this was not a full Administration installation.

The workflows exercised editing, pending duplicate-submit prevention, save,
reopen, empty overrides, preservation of other loaded fields, rendered errors
and retry. The wizard also exercised Back/Next without persistence. Alternative
bindings supporting both event contracts passed calibration; no particular
template spelling or rule citation earned a pass.

| Source-audited complete workflows; two attempts per feature | Current paragraph | Paragraph removed |
| --- | --- | --- |
| Haiku (`claude-haiku-5-5`) | 3/4 | 0/4 |
| Sonnet (`claude-sonnet-5-5`) | 4/4 | 4/4 |
| Total | 7/8 | 4/8 |

All four ablated Haiku answers used plain `v-model`, which targets
`modelValue` on Vue 3 while these fields expose `value`. The current-package
miss used only `@update:value`, losing edits on the default 6.5 profile; that
session invoked the skill but never returned the architecture reference.
The rule text was returned in 7/8 current sessions and no ablated session.
Changing only binding attributes fixed all five genuine failures in replay,
without changing their save logic. Those repairs are diagnostic, not new trials.

**The original scores remain 6/8 versus 4/8.** The frozen fixture backend
created an Error in a different VM realm, falsely rejecting a correct
`instanceof Error` guard. A separate replay shared the constructor, matching
the browser's API/component realm, and changed one workflow classification.
The correction was applied uniformly to all 16 retained answers. Neither
answers nor original graders were overwritten. The eight-of-eight retention
criterion still fails because one current answer genuinely missed the binding
contract. The engineering recommendation must not be reported as a clean
prospective-gate success.

The source/runtime checks also disproved the rule's old "never fires"
explanation: an old `change` listener can receive a native DOM event through
attribute forwarding, rather than the scalar payload it expects. The rule now
states that boundary, accepts both-contract bindings, and has a short entrypoint
reminder. The reminder's effect on reference reading has **not** been A/B-tested.

Confidence is moderate for retaining this specific information. These are two
different feature implementations sharing **one binding API family**; model
attempts are not independent task families. The observed benefit is on Haiku,
and it depends on reading the reference. There is no population effect,
safe-removal, automatic-discovery or whole-Admin-skill quality claim.
The observed difference is +25 percentage points in the editor and +50 in the
wizard, pooling the two models. These are descriptive sensitivity results,
not independent population estimates or confidence bounds.

The preceding [broad protocol](../evals/experiments/admin-workflows-v1.json)
completed 32 sessions but had two invalid verification families: ordinary
directory imports were mishandled, and route exit was underspecified with
multiple table instances. Its remaining two families tied at 8/8 per arm.
The invalid families and repaired regression replays are retained separately;
they do not support a skill-retirement recommendation.

The [compact record](../evals/experiments/admin-decisions-2026-11-04.json)
pins both protocols and the local archives of original and audited evidence.
