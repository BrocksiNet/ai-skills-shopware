---
name: shopware-change-impact
description: >-
  After a Shopware feature works, review its blast radius before calling it
  done. Use when a change is implemented and you are deciding whether to ship
  it: shared HTTP cache, checkout or listing cost, asset loading that was only
  tested locally, a Symfony container split, and whether the shop got easier.
  Triggers on "feature is done, review the impact", "blast radius of
  this change", "who else does this header affect", "does this slow checkout
  for everyone", "is the shop easier after this feature",
  "asset loading only tested locally",
  "symfony container if per feature flag". Do NOT use for
  line-level Shopware idioms (shopware-review-learnings), GitHub thread triage
  (shopware-pr-review), implementing DAL or cache tags
  (shopware-plugin-development), storefront AJAX cache rules
  (shopware-storefront), or replacing raw PHP filesystem calls
  (shopware-core-development).
---

# Change impact (after the feature works)

The ticket passing is not the review. Models stop once the new behavior exists.
This skill is the step after that: look at the shop, not the diff.

Load the checklist only when you are judging a finished change:
[`references/impact-review.md`](references/impact-review.md).

Do not restate cache-tag mechanics, DAL limits, or storefront AJAX rules here.
Those stay with their owning skills. This skill only decides whether the
change is acceptable for everyone else.

## Hard guardrails

1. **Do not approve "it works."** A green test and a matching acceptance
   criterion are the start of the review, not the end.
2. **A shared cache key is not a private feature.** A new request header,
   cookie, query parameter, or `Vary` entry on a route that other clients
   already cache changes the cache for those clients too.
3. **The people who do not use the feature must not pay for it.** Extra data
   loaded on checkout, cart, or a listing runs for every customer unless the
   work is skipped when the feature is off.
4. **One feature does not outweigh a slower shared path.** If the only design
   that "completes" the ticket slows checkout or listings for every shop, stop
   and narrow it. Say that out loud.
5. **Easier beats more complete.** A new setting, header, or ritual that only
   makes the feature work has made the shop harder. Prefer the change that
   removes a step.
6. **A local asset test does not prove production asset loading.** Theme
   assets, media, and compiled storefront files are often on remote storage
   (S3 or another object store). A loading, copy, or URL change that only
   passes against the local `public/` directory still breaks every shop whose
   filesystem is remote.
7. **There is one compiled container.** An `if` in the Symfony container
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
