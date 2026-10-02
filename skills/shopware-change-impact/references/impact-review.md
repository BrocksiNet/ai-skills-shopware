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

## Asset loading

Local green is the local filesystem. Production often is not.

- Theme assets, media, and compiled storefront files are stored on an external
  filesystem (S3, Google Cloud Storage, another object store). A change to how
  those files are resolved, copied, moved, or turned into URLs reaches every
  shop on that storage, not only the shop you booted locally.
- `file_exists` on `public/`, a folder rename, or a URL built from the local
  document root passes when the adapter is local. Object storage has no real
  folders: a "move directory" is one request per object, and it is not atomic.
  See the theme-compilation ADR for that constraint. Do not restate the copy
  algorithm here. Decide whether this change still works when the filesystem
  is remote.
- A test that only writes the local public directory has not reviewed the
  change. If the new loading path works only on local disk, the verdict is
  `do not ship` or `narrow the design` until the same path is the one remote
  storage will run.

## One container

SaaS compiles one Symfony container and serves every shop from it. There is
no container per feature flag, sales channel, or other condition.

- An `if` in `services.php`, XML, a compiler pass, or a `when@` / env split
  that registers different services depending on a flag produces a different
  container. The container that was compiled is the only one that runs. Shops
  on the other side of that `if` do not get their own container later.
- A runtime `Feature::isActive` inside a service that always exists is the
  acceptable shape. A service that is missing because the flag was off at
  compile time is not.
- Local PHPUnit boots one kernel. That does not prove a second container
  shape exists in production. Production will not build it.
- Verdict `do not ship` when the feature only works by forking the container.
  `narrow the design` when the same feature can live as a runtime branch in
  the one container.
- Shopware's 6.8 test flag (`V6_8_0_0=1`, planned from 6.7.16) compiles a
  separate container so removed services fail in that run. That is a test
  switch. It is not a plugin design, and it is not this review. Preparing the
  plugin is `shopware-plugin-development`.

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
| `do not ship` | The only way to meet the ticket harms the shared shop (cache split, slower checkout for non-users, assets that only resolve on local disk, a second container per flag, a new required ritual). |

Do not soften `do not ship` into a list of nits. The point of this review is
the shop after the change, not the style of the patch.
