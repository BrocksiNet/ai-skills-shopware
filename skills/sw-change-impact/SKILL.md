---
name: sw-change-impact
description: >-
  Use when a Shopware change works and the next step is a commit or a pull
  request. Check shared HTTP cache, who pays when the feature is off, asset
  loading tested only on local disk, and a Symfony container split. Do NOT
  use while the fix is still being written, for line-level idioms
  (sw-review-learnings), GitHub thread triage (sw-pr-review),
  implementing the change (shopware-php-code or sw-plugin-development),
  or running the test suite (sw-podman-dev).
license: MIT
metadata:
  contexts: core plugin app project
  tasks: review ship
  load_for: ship
---

# Change impact (after the feature works)

The ticket passing is not the review. Models stop once the new behavior exists.
This skill is the step after that: look at the shop, not the diff.

Read the reference that matches the task or the files it changes:

<!-- routes:start: generated from routes.json by `node tools/bin/render-routes.ts`; do not edit -->
| Read | When | Or the change touches |
| ---- | ---- | --------------------- |
| [`impact-review.md`](references/impact-review.md) | You judge a finished change. | any change |
<!-- routes:end -->

Do not restate cache-tag mechanics, DAL limits, or storefront AJAX rules here.
Those stay with their owning skills. This skill only decides whether the
change is acceptable for everyone else.

## Hard guardrails

1. **IMP-001** **Do not approve "it works."** A green test and a matching acceptance
   criterion are the start of the review, not the end.
2. **IMP-002** **A shared cache key is not a private feature.** A new request header,
   cookie, query parameter, or `Vary` entry on a route that other clients
   already cache changes the cache for those clients too.
3. **IMP-003** **The people who do not use the feature must not pay for it.** Extra data
   loaded on checkout, cart, or a listing runs for every customer unless the
   work is skipped when the feature is off.
4. **IMP-004** **One feature does not outweigh a slower shared path.** If the only design
   that "completes" the ticket slows checkout or listings for every shop, stop
   and narrow it. Say that out loud.
5. **Easier beats more complete.** A new setting, header, or ritual that only
   makes the feature work has made the shop harder. Prefer the change that
   removes a step.
6. **IMP-006** **A local asset test does not prove production asset loading.** Theme
   assets, media, and compiled storefront files are often on remote storage
   (S3 or another object store). A loading, copy, or URL change that only
   passes against the local `public/` directory still breaks every shop whose
   filesystem is remote.
7. **IMP-007** **There is one compiled container.** An `if` in the Symfony container
   (service definition, compiler pass, `when@`, or a feature-flag condition)
   that builds a different container per flag or per condition cannot ship.
   SaaS runs one container for every shop. Feature differences are runtime
   checks inside that container, not a second container.

## What to answer before "done"

Write these four lines. Do not skip one because the code looks small.

- **Blast radius** — who is affected beyond the ticket (other routes, other
  sales channels, cached responses, shops that never enable this, shops whose
  assets live on S3, every shop on the single compiled container).
- **Who pays** — all customers, or only shops and sessions where the feature
  is actually on.
- **Easier or more complex** — did a merchant, storefront customer, or the
  next developer lose a step, or gain one.
- **Verdict** — `ship`, `narrow the design`, or `do not ship`. `ship` is only
  allowed when the first three lines are acceptable.

## Definition of done

- [ ] The four lines above are answered from the real change, not from the ticket title.
- [ ] Shared HTTP cache, checkout/listing cost, remote asset storage, and a single compiled container were considered even when the diff does not mention them.
- [ ] A feature that taxes non-users is marked `narrow the design` or `do not ship`.
- [ ] Implementation details that belong to another skill are not redefined here.
