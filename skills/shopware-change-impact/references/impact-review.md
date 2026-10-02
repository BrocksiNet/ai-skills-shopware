# Impact review

Use this after the feature behaves as the ticket asked. You are not looking
for coding-style mistakes.

## Blast radius

Ask what else this change touches, even if those files are not in the diff.

- A new required header on Store-API or a storefront route is part of the
  request that HTTP cache already varies on. Every client of that route can
  miss cache, not only the new analytics or feature client.
- A cookie, query flag, or `Vary` addition has the same effect. "We only read
  it in one controller" does not keep it local.
- A subscriber on a generic event (`ProductPageLoadedEvent`, checkout, cart)
  runs for every shop that has the plugin active, including shops that never
  open the new admin screen.

If you cannot name who else is affected, you have not reviewed the change.

## Who pays

Put the cost next to the audience.

- Loading extra order, customer, or line-item data so Google Analytics (or
  any tracker) is "more complete" is paid by every checkout, including
  checkouts where analytics is off or the shop never configured it.
- Default the expensive work to off. Run it only when the integration is
  configured and the current request needs it. Do not put it on the shared
  path and then document that merchants can turn it off later.
- A slower checkout for everyone is a worse shop, even when the one feature
  gets better data.

Performance of a shared path outranks completeness of a single feature.

## Easier, not more complex

- Making the feature work by adding a header the caller must now send, a new
  config field, or a second code path is added complexity. Call that out.
- The better change removes work: reuse an existing extension point, keep the
  old request valid, compute the extra data where the consumer already is
  (the analytics tool, not the checkout).
- "The merchant can configure it" is not easier. It is another thing they can
  get wrong.

## Verdict

| Verdict | When |
| ------- | ---- |
| `ship` | Blast radius stays on the feature's own users, shared paths are not slower, and the shop is easier or unchanged. |
| `narrow the design` | The feature is worth having, but the current shape taxes other requests, other shops, or cache. Say what to cut or gate. |
| `do not ship` | The only way to meet the ticket harms the shared shop (cache split, slower checkout for non-users, a new required ritual). |

Do not soften `do not ship` into a list of nits. The point of this review is
the shop after the change, not the style of the patch.
