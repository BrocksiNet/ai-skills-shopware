# Results

What the evals have shown so far, including where the skills did not help.
Every number comes from an A/B run: the same task with the skills on and off,
graded by a script, not by a model. Method: [`architecture.md`](architecture.md#how-a-rule-is-proven).
Detail and history: the plans in [`plans/`](plans/) and the
[changelog](../CHANGELOG.md).

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
| Active rules with an ID | 263 |
| Rules with an eval task | 94 |
| Eval tasks | 140 |
| Review tasks (catch, ignore and near-miss) | 77 |
| Routing cases | 11 |

Rules without an eval record why in the catalog, usually a process or style
rule that core's own CI already enforces. They are the visible backlog.
