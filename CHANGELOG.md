# Changelog

All notable changes to this skills repository are documented here. Release tags
drive version pinning for `skills.sh` installs (`npx skills update`).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Claude Code plugin.** Claude Code users can install every skill in one
  step with `claude plugin install shopware-skills --marketplace
  BrocksiNet/ai-skills-shopware`. The plugin follows releases, not `main`.
  See [Claude Code plugin](docs/installation.md#claude-code-plugin).

## [0.20.0] - 2026-11-27

This release adds a skill for git worktrees, lets skills remember how you
like to work, and brings a first, experimental skill for building MCP
tools. Skill descriptions are also 41% shorter, so installed skills take
less of your agent's context.

### Added

- **Git worktrees in one place.** The new `sw-worktrees` skill puts every
  worktree under one folder with a predictable name per project and pull
  request, and removes a worktree only when it is merged, clean and pushed.
- **Personal preferences.** A skill can now ask how you like to work (for
  example, where your worktrees live) and keep your answers in
  `~/.config/ai-skills-shopware/`, outside the repository. See
  [skill preferences](docs/skill-preferences.md).
- **Building MCP tools (experimental).** The new `sw-mcp-development` skill
  helps when a plugin or app adds tools to Shopware's MCP server: naming and
  registering them, safe write tools with a dry run, permission checks, and
  small, structured responses.
- **Safer Administration overrides.** `sw-admin-js` now warns before you
  replace a core block without `{% parent %}`, use variables the block does
  not provide, reach into `$parent` or core source files, or override a
  method the component does not have.
- **App rules.** `sw-app-development` now has numbered rules for the
  manifest, permissions, Admin SDK UI, app scripts and the registration
  handshake, and the extension review checks them.
- **Podman dev setup.** `sw-local-dev` knows the new `sw-dev` commands:
  `startup` starts only autostart instances (`--all` for every one),
  `lane start|stop|refresh` manages a lane, and `mcp bootstrap` sets up MCP
  after a fresh install.
- **Quieter router.** `sw-skill-router` can run as a Claude Code hook and
  stays silent when it has nothing new to say; `--brief` prints a short list.

### Changed

- Shorter skill descriptions (11,863 to 7,039 characters), and the largest
  references in `sw-testing`, `sw-php-foundation` and
  `sw-plugin-development` are split, so the agent loads only the part it
  needs.
- `sw-pr-review` and `sw-local-dev` follow `sw-worktrees` for where a
  worktree goes and what it is called.
- The API index tells whether a breaking change affects code that calls an
  API or code that extends it, and now covers Storefront feature flags and
  older Administration SCSS and snippets.

### For contributors

- Evals record which references the agent read, five new near-miss review
  tasks guard against citing the wrong rule, and `EVAL_CONCURRENCY` runs
  local evals in parallel.
- The model eval workflow no longer opens a baseline PR from a run the
  provider broke (a Copilot quota had turned 284 of 285 tasks into errors).
- Tighter graders and fixtures for 15 tasks, and repaired hunk headers in
  25 review patches.
- Golden graders run in-process and in parallel; dependencies updated.

## [0.19.0] - 2026-11-25

This release adds two security rules, for untrusted XML and for MCP tool
permissions, and corrects several PHP and Symfony tips that were wrong or
too strict. Storefront and Administration work now pairs with Google
Chrome's `modern-web-guidance` skill by default.

### Added

- **Safe XML parsing.** `sw-security` now asks you to parse XML that did
  not ship with your code through `XmlParser`, not `XmlUtils::parse()` or
  `loadFile()`. The extension review checks it too.
- **MCP tool permissions.** An MCP tool in a plugin must check its own
  privileges. The `#[McpToolRequires]` attribute only documents them and
  does not enforce anything.
- **Numbered PHP rules.** Every rule in `sw-php-foundation` now has an ID,
  so reviews can cite it. They cover strict types, imports, code style,
  injected interfaces, the clock, named arguments, data shapes, readonly
  and the supported PHP range.

### Changed

- **Modern web guidance by default.** Google Chrome's `modern-web-guidance`
  is now the suggested companion for Storefront and Administration work
  (before, we advised against it). Shopware components such as Bootstrap
  and Meteor still win. `sw-skill-router` reminds you of it on frontend
  changes, or prints the install command when it is missing.
- **Corrected PHP and Symfony advice.** Keep the concrete DAL
  `EntityRepository`, because there is no repository interface to inject.
  Feature checks take the four-part flag ID such as `v6.8.0.0`, while
  deprecations keep the three-part release such as `v6.8.0`. Simple typed
  internal arrays are fine, and readonly is only for immutable contracts.
- **Simpler internal swaps.** `sw-core-development` lets you replace an
  internal implementation directly when the new one behaves the same. Two
  code paths behind a flag are only needed for incompatible changes or a
  staged rollout.
- **Administration on 6.8.** `sw-admin-js` treats a change to core's new
  `public-api/` block snapshot like one to `blocks-list.json`, as an
  extension API change. It also explains how an extension's Jest tests
  move to the 6.8 setup now that trunk removed the old feature-flag helper.

### For contributors

- Core's Administration and Storefront deprecation-guard ESLint rules are
  recorded as trunk-only checks.
- A rejected-proposals list records dropped rule ideas with the reason;
  `suggest-rules` shows them and fails a proposal that repeats one.
- The repository-injection, HTTP client and clock graders check the code
  structure instead of tokens, so a made-up DAL interface or an unused
  dependency no longer passes.
- Model evals count a real read of a skill file by Claude as a loaded
  skill; listing or grepping it does not.

## [0.18.0] - 2026-11-20

The API index now sees Administration changes it missed before: blocks
that only exist with a feature flag, and signature changes of props and
methods. The `shopware-api-index` package the skills run now needs Node 26
or newer, and the old `sw-podman-dev` name is gone.

### Added

- **Flag-dependent Administration blocks.** The API index knows which
  admin blocks, slots and components exist only with a feature flag on or
  off. A block moved behind the 6.8 flag counts as announced, not as a
  break, and the facts name the flag state.
- **Administration signatures.** The API index records prop types,
  parameters and return types. It reports a new required parameter or
  prop, a removed parameter, a narrowed type and a removed computed
  member, and says in which release a signature changed.

### Changed

- **Node 26 for the API index.** The `shopware-api-index` package the
  skills run is now `0.1.0-beta.2` and needs Node 26 or newer.
- **Services with their own reset.** `sw-architecture` covers a service
  whose `reset()` method already does something else: the `kernel.reset`
  tag then names another method.
- **Fairer extension reviews.** `sw-extension-review` rates a test that
  cannot fail as major instead of minor. On plugin changes it no longer
  asks for test conventions that only core uses, such as the `#[Package]`
  attribute or `#[CoversClass]` on integration tests.

### Removed

- **`sw-podman-dev`.** The pointer kept for one release after the rename
  is gone. Install `sw-local-dev` instead.

### For contributors

- Repo tooling and CI run on Node 26 (was 24).
- A new API index cross-check compares `api-diff` with the impact notes on
  core PRs and explains each miss; its first run led to the signature
  support above.
- The weekly API change report rebuilds last week's trunk when the
  generator changed, instead of reporting hundreds of false deprecations.
- `suggest-rules draft` keeps the title of an updated rule, asks for a
  task per new case, runs both halves of a review pair in its A/B and no
  longer blocks the A/B with an empty results file.
- The DDEV grader accepts a check script that runs tools directly inside
  the container and uses `ddev exec` outside it.

## [0.17.0] - 2026-11-12

`sw-podman-dev` is now `sw-local-dev` and knows how to run Shopware
commands in DDEV, Docker Compose, Vagrant, native and Podman setups. The
skills no longer bundle a large API index script; they run a small npm
package instead. There is also a new security rule for validation regexes.

### Added

- **Commands for every local setup.** `sw-local-dev` runs Shopware
  commands where the project runs: DDEV, Docker Compose, Vagrant, native
  host tools, linked Podman lanes and Shopware CLI projects.
- **Regex end anchors.** `sw-security` asks you to end a validation regex
  with `\z` or the `D` modifier, because a bare `$` also matches before a
  trailing newline. Core's PHPStan check only runs in core, so extension
  reviews need this rule.

### Changed

- **`sw-podman-dev` is now `sw-local-dev`.** The old name stays for one
  release as a pointer. Replace it in your install commands and in the
  `skills` list of `~/shopware-dev/instances.json`.
- **API index as an npm package.** Five skills no longer carry their own
  631 KB copy of the API index tool. They run the `shopware-api-index`
  package, pinned to a version, for example
  `npx -y shopware-api-index@0.1.0-beta.1 facts .`.

### For contributors

- The weekly drift issue reads more of core: nested `AGENTS.md` files,
  the shared-guidance ADR, the agent-skills policy, the environment
  templates and the lint rule settings. Core's environment templates and
  shopware-cli's skills feed the `sw-local-dev` drift too.
- The 68 single-call review pairs are one table instead of 136 grader
  files, and 223 tasks lost a `grade.sh` that only called `grade.ts`.
  All golden verdicts are unchanged.
- `shopware-api-index` is published with npm trusted publishing instead of
  a token; a maintainer approves each version on npmjs.com.
- Review pairs now test the two plugin migration rules: no heavy work in
  `updateDestructive()`, and derived data from an indexer, not SQL.
- Each new local setup has an eval task, except Docker, which Haiku
  already handled without the skill.
- OpenCode eval runs no longer ask the model for a session title, which
  made Ollama tasks wait and cost hosted models tokens.
- A plan for core sources, local environments, MCP and the admin API
  index is in `docs/plans/`.

## [0.16.0] - 2026-11-09

The API index tools now ship inside the skills, so checking an extension
against several Shopware releases needs only Node. `sw-podman-dev` learns
the new shopware-dev lane commands and hands Shopware CLI projects to the
CLI's own skills. There is also an experimental skill for core's generated
OpenAPI DTOs.

### Added

- **OpenAPI DTOs (experimental).** The new core-only `sw-openapi-dto` skill
  covers the request and response DTOs core generates from its OpenAPI
  schema: change the schema and regenerate instead of editing a DTO,
  delete stale DTOs by hand, apply defaults in business code, and set
  status and headers on the response DTO. The core feature is still a
  draft (shopware/shopware#17858).
- **API checks from the installed skill.** `sw-change-impact`,
  `sw-core-development`, `sw-extension-review` and `sw-plugin-development`
  bring a script that runs the API index `diff` and `facts` with plain
  Node. Output starts with a summary line, and `diff` exits with 3 on a
  break.
- **Changed template blocks.** The API index reports Storefront and
  Administration blocks whose content changed between releases. A missing
  block links to core's template at the first release without it, and
  `sw-storefront` says when to wrap `{{ parent() }}`, copy that template or
  move the markup to a block that exists in every supported release.
- **No separate test processes.** `sw-testing` says unit and devops tests
  never run in a separate process. Trunk's Danger check already catches
  this in core.

### Changed

- **Shopware CLI projects.** `sw-podman-dev` picks the right runner for a
  linked core checkout, a CLI-managed shop, a standalone plugin or an
  unrelated project. It hands CLI-managed work to the upstream CLI skills
  and keeps project quality checks apart from extension validation.
- **Lane lifecycle.** `sw-podman-dev` knows `sw-dev lane
  create|update|remove`, `sw-dev versions`, `sw-dev space` and `sw-dev
  prune`. It never removes lanes or volumes without your go-ahead, and
  `trunk` stays. Extensions are wired through `sw-dev ext` and a
  git-excluded file, so agents no longer change `composer.json`.
- **Rector for plugin migrations.** Plugin migration guidance links the
  upstream Rector rules and their limits, and records the chosen versions
  and rule sets instead of copying transformations into the skills.
- **Fewer duplicate rules.** Four duplicate review rules are merged into
  the rules that own them (226 to 222 active rules).
- **Fewer false API breaks.** The API index reports a class moved with
  `#[ClassMoved]`, or a member a parent, trait or interface took over, as
  a move, not a removal. It also follows negated `instanceof` checks and
  chained calls, which finds more real `@internal` and `@deprecated` uses.

### Fixed

- **Old Administration fields on 6.5 and 6.6.** `sw-admin-js` explains why
  plain `v-model` binds the wrong prop on Vue 3 and why an old `change`
  listener can get a native event, and accepts bindings that work with
  both. See the
  [workflow study](docs/results.md#admin-form-binding-decision--november-4-2026).
- **Extension validation.** `sw-podman-dev` no longer passes `--no-copy` to
  `shopware-cli extension validate`; since shopware-cli 0.19.8 it checks
  the folder in place.

### For contributors

- A weekly API change report compares trunk with last week's trunk and
  each new tag with the one before.
- `tools/bin/skill-context.ts` measures how much of the input our skills
  take (under half a percent over 14 days), with a plan to shrink it.
- The drift issue tracks FriendsOfShopware's Rector docs and maps its new
  security and store preflight skills to ours.
- Eval runs freeze their task plan and keep trial outcomes; tool tests
  have scoped Stryker profiles with a 95% floor; old eval reports moved to
  an evidence archive.
- `suggest-rules` proposes retiring a rule only when the skill shows no
  gain on at least two models.
- The `run-evals` label and manual runs use Copilot by default, and a
  model that fails the preflight is dropped instead of failing the run.
- The Storefront blocks grader no longer counts the agent's own cleanup as
  a false alarm.

## [0.15.0] - 2026-10-29

This release makes the skills leaner and more reliable: 58 rules that
showed no measured effect are gone, and the main skills now load before an
edit, even a small one. It also adds a final prose check for the agent's
answers, a rule for new Administration components, and a rule that keeps
test expectations from changing quietly.

### Added

- **New Administration components.** `sw-admin-js` now asks for
  TypeScript, `wrapComponentConfig()` and composables instead of mixins in
  new components. On trunk the agent copies the reference components named
  in the Administration guide, not the code next to it.
- **Answers that read like a person wrote them.** Before handing back
  text, `sw-assistant-style` has the agent read it once more and rewrite
  machine-writing tells without adding or dropping facts. The checklist is
  our rewrite of [humanizer](https://github.com/blader/humanizer), and
  `sw-pr-description` uses the part that fits a PR body.
- **Test expectations stay put.** `sw-testing` now flags a PR that flips,
  loosens or skips an existing assertion, or edits a data-provider case,
  unless the PR and changelog announce the behavior change.

### Changed

- **Plugin Administration modules stay overridable.** The old "follow the
  patterns of the area" rule in `sw-admin-js` now covers plugins only: a
  module built with `Component.register` and Twig blocks gets no `.vue`
  file, because other extensions could not override its blocks.
- **Skills load before an edit.** The descriptions of the main skills,
  such as `sw-plugin-development`, `sw-architecture` and `sw-testing`, now
  say to load the skill before any edit and name the code that needs it.
  On small build tasks Haiku used to load no skill; now it loads one in 41
  of 51 runs.
- **Reading every row.** `sw-architecture` now says how to handle a job
  that needs all rows: page through them in a loop, with
  `RepositoryIterator` or an ID cursor. A single limit without the loop
  silently drops the rest.
- **PHP basics for core work.** The rules against `empty()` and for backed
  enums now live in `sw-php-foundation`, and `sw-core-development` points
  at them, because the agent often loads it alone for core work.
- **One thin-controller rule.** Three copies of the same rule became one
  in `sw-plugin-development`, which the extension review reads, so a review
  can cite it.
- **Fewer repeated checks.** Three more core checks are listed under
  "Already enforced by CI": Store API route extension events, feature-flag
  skips in unit tests and reflection in unit tests.
- **Code comments.** The comment rule in `sw-review-learnings` now also
  kicks in on "instead would" and on bare issue numbers in comments.

### Removed

- **58 rules without a measured effect.** With the skill switched off,
  the agent already got these right in every run, so they only cost
  context. Eight rules stay anyway, because a miss is severe on weaker
  models, for example committing secrets or editing a released migration.

### For contributors

- Drift mining reads every repository in `rules/sources.json`, groups the
  weekly issue by skill and rule, and lists review comments per skill. It
  has replay tests and a dry-run mode, and several mining bugs are fixed.
- A daily collector turns review comments on merged core PRs into signals
  with a reviewer trust score, published as the `review-signals` release.
- `suggest-rules.ts` proposes new, changed and retired rules from those
  signals, and `suggest-rules draft <id>` turns one into a draft PR. See
  [suggesting rule changes](docs/maintenance.md#suggesting-rule-changes).
- `replay-routes.ts` measures router recall on 34 recorded core PRs, with
  a recall floor in CI.
- Several eval tasks now ask for a feature instead of naming the rule,
  with stricter graders, a new DAL paging task and a thin-controller
  review pair. The catalog has `keep_reason` and `retired_reason` fields.
- The CI eval model is `opencode/mimo-v2.6-flash-free`, with a preflight
  check, 16 shards and no web search. Eval runs no longer count a failed
  skill call as loaded, and the baseline job refuses empty results.
- The prose check has its own eval task and grader. In a local A/B on
  Sonnet a blind judge preferred the checked texts in 14 of 22 pairs, and
  humanizer is now a drift source. The style rules got their own prefix.
- The README shows current A/B results and how mining and review
  collection work.

## [0.14.0] - 2026-10-23

Every skill name now starts with `sw-`, so you need to reinstall under the
new names. The new `sw-skill-router` tells you which skills and references
a change needs, and `sw-help` lists what each skill is for.

### Added

- **Skill router.** `/sw-skill-router` reads your git diff, a saved diff
  or planned paths, works out whether each file is core, plugin, app or
  project code, and lists the skills and references to load with the file
  or line behind each. It ranks them by matches, warns on large diffs,
  says which core skill leads a topic, and prints install commands for
  missing skills.
- **Skill overview.** `sw-help` explains what every skill is for, grouped
  by task, with example prompts.
- **Comments about the code.** `sw-review-learnings` asks that comments
  and docblocks describe the code, not the history of the change.
- **Visibility checks by ID.** `sw-review-learnings` warns that a check
  with `searchIds()` misses restrictions applied when entities load, such
  as Dynamic Access hiding categories.

### Changed

- **Breaking: new skill names.** `php-foundation` is now
  `sw-php-foundation`, and every `shopware-<topic>` skill is now
  `sw-<topic>`. Remove the old folders and install the new names, see
  [installation](docs/installation.md). Our `sw-admin-js` no longer clashes
  with core's `shopware-admin-js`.
- **Shorter README.** The README says why to use the library; installation,
  architecture, results and maintenance have their own pages under
  `docs/`.
- **Less noise from references.** Production-code references no longer
  load for tests, ADRs or release notes, and a renamed file counts under
  its old and new path.

### For contributors

- Routes take `exclude_paths` with a default per file; new routing cases
  for test suite moves and history comments.
- Every `SKILL.md` has a `metadata` block that generates the router index.
- `validate-skills` checks the metadata, that the router index is current
  and that `sw-help` names every skill.
- Review catch and ignore pairs for the two new review rules.

## [0.13.0] - 2026-10-22

The API index, which `sw-change-impact` and `sw-core-development` use to
spot breaking changes, now covers much more than PHP. It sees routes,
entity fields, feature flags, configuration, the Administration, the
Storefront and Twig, and a new diff command reports what a change breaks.

### Added

- **Routes, entities, flags and config.** The API index records routes
  with their scope and OpenAPI coverage, entity fields and their API
  flags, feature flags and bundle configuration keys. It finds
  deprecations wherever core writes them.
- **Administration and Storefront.** The index covers admin components
  with their props, methods, events, slots and blocks, and Storefront
  templates, blocks and JS plugins with their options. It also knows the
  Twig functions, filters and tags core adds, and whether the build uses
  webpack or Vite.
- **What a change breaks.** `api-diff` reports what a change removes,
  changes or deprecates on all these surfaces, from a `shopware/shopware`
  clone or offline from the index. The change-impact and core
  compatibility references point at it.
- **What an extension uses.** `api-facts` reads an extension's admin
  overrides, Storefront templates, plugin overrides, Twig calls and admin
  webpack config, and finds an overridden block through `sw_extends` or
  the component it extends.

### For contributors

- `check-breaks` measures `api-diff` against the breaks in the 6.6, 6.7
  and 6.8 UPGRADE files (97.2% recall, 97.1% precision); the weekly index
  workflow runs it.
- Three review pairs for frontend APIs core removed in 6.7: a Storefront
  template, a Storefront JS plugin and an Administration block.
- The index timeline merges one release at a time, because the full build
  ran out of memory.

## [0.12.0] - 2026-10-22

This release adds a public API index of Shopware and a command that checks
an extension against it. The extension review can now tell whether the
Shopware API a plugin uses exists, and is safe to use, in every release
its `composer.json` allows.

### Added

- **Shopware API index.** A weekly build records the PHP API of every
  Shopware release since 6.5.0.0 plus trunk, with which classes and
  methods are internal, deprecated, experimental, final or changed in each
  release.
- **API facts for an extension.** `api-facts` lists the Shopware API an
  extension uses that is missing, internal, deprecated or changed in part
  of its supported range. It also flags version guards on API that every
  release in the range already has. `shopware-extension-review` and
  `shopware-plugin-development` point at it.

### Fixed

- **Version guard example.** The guard example in
  `shopware-plugin-development` now checks for the `addTag()` method, not
  the `CacheTagCollector` class: the class exists from 6.6.6.0, but the
  method only from 6.7.2.0.

### For contributors

- Review pairs for the supported version range, dead or unneeded version
  guards and guards on later members. On the last three, Haiku catches 15
  of 15 with `api-facts` and 5 of 15 with the skills alone.
- Review graders take an `also` list of rule IDs that count as equally
  right.

## [0.11.0] - 2026-10-22

This release teaches the extension review to catch problems that depend
on a Shopware version or API fact, and brings `shopware-pr-description` in
line with the new core PR template.

### Added

- **Version-aware extension review.** `shopware-extension-review` now
  catches six more problems: a 6.7 subscriber to a cache tags event that is
  no longer dispatched, a flat privilege mapping that breaks the role
  screens, a `webpack.config.js` the 6.7 Vite build ignores, `sw_csrf()` in
  a new storefront form, a new `services.xml` in a plugin for 6.8, and the
  default context for storefront product data.
- **More rules in the review.** The review now also reads the rules on
  deprecations that point at a usable replacement and, for a plugin's own
  cache, on cache keys that hold every input.
- **Plugin config files.** The version compatibility guide in
  `shopware-plugin-development` now also loads when a change touches a
  plugin's `services.xml` or `routes.xml`.

### Changed

- **New core PR template.** `shopware-pr-description` follows the
  five-section template from shopware/shopware#21627: "What and why?",
  "How?" with an optional "Impact" part, "Testing", "Additional notes" and
  the checklist. The template's own agent instructions on trunk win over
  the skill.

### Fixed

- **Review cites the right rule.** Several rules sat where the extension
  review never looked, so it cited the nearest rule it had read, or missed
  the Vite fact entirely. They now live in the guides the review reads.
- **Privilege mapping.** The skills now say that every role needs
  `dependencies`, even an empty list. Without it the mapping registers and
  then breaks the role screens.
- **Cache tags on early 6.7.** `addTag()` exists from 6.7.2. On 6.7.0 and
  6.7.1 the skills accept `AddCacheTagEvent` instead.

### For contributors

- Review pairs for each of the six new review problems.
- `validate-rules` fails when a review task expects a rule tagged where
  the reviewing skill cannot read it.
- The PR description rules are tagged, and the `pr-no-ai-trailers` grader
  checks trailers in any case and each kept text in its own section.
- WP6 acceptance asks the skills to win on at least four review catch
  tasks for plugin and app rules.

## [0.10.0] - 2026-10-21

This release adds five rules taken from a real review of a plugin, so the
extension review catches these problems in your code too. It also fixes a
case where the review could not open its own references.

### Added

- **Administration overrides call `$super`.** `shopware-admin-js` now
  checks that a core component override calls `$super` for every method it
  replaces.
- **No `system_config` in plugin roles.** A role a plugin ships must never
  grant `system_config` privileges.
- **One bundle for 6.5 and 6.6+.** An Administration bundle that serves
  both binds `sw-*` form fields with `v-model:value`.
- **Idempotent responses stay private.** `shopware-security` now says to
  replay a stored idempotent response only to the caller that created it.
- **Optional packages stay optional.** Code that runs at boot must not use
  a suggested package outside its guard.
- **Review questions.** `shopware-extension-review` now asks about all
  five rules.

### Fixed

- **Review references open again.** `shopware-extension-review` opens each
  selected reference by its path. File search does not follow the
  symlinked skill folders, so one run reported the references as missing.

### For contributors

- A review pair for each new rule, and the idempotency near-miss task
  accepts the new security rule.

## [0.9.0] - 2026-10-21

This release adds `shopware-extension-review`, a skill that reviews a whole
plugin or app change, and many new review rules for public API,
migrations, caching and tests. Skills now read only the reference a change
needs and skip what CI already checks, so reviews are shorter and more to
the point.

### Added

- **Extension review.** The new `shopware-extension-review` skill reviews a
  plugin or app diff as a whole, using the rules of the topic skills, and
  ends with a findings list. See the install line in
  [use-cases/extension-review.md](use-cases/extension-review.md).
- **Careful rule citations.** The extension review cites a rule only when
  the rule's own words cover the finding, and cites none otherwise. It also
  asks about raw SQL writes, `uninstall()` and Admin ACL for new
  associations, and says "same as core" when a finding copies core behavior.
- **Public API stays stable.** New rules: never make an existing API route
  stricter, never change the type or nullability of an API response field,
  and never change the access or cache defaults of a released route.
- **Storefront and Administration contracts.** Storefront JS plugin options
  and events, snippet keys and theme fields count as public API, and the
  HTTP cache is never switched off from the side. Administration component
  API and position identifiers are covered in `shopware-admin-js`.
- **Safer migrations.** Content migrations skip rows the merchant edited,
  migrations use no feature flags, and `update()` never narrows a column;
  that belongs in `updateDestructive()`.
- **More review rules.** A cache key holds every input; a service that
  memoizes in a property implements `ResetInterface`; queued work has no
  inline synchronous fallback; extension events are a contract and do not
  pass the whole `Request`.
- **Deprecations that help.** Shipped Twig blocks, variables and templates
  are deprecated before they are renamed, and a deprecation points at a
  replacement that extensions can use today.
- **Core-only rules.** Four new `shopware-core-development` references cover
  removal shims, data and config compatibility, console commands, platform
  scope and the lifetime of theme files and media.
- **Rule IDs everywhere.** Every rule in the testing, plugin, core,
  Administration, architecture, storefront, security, change impact and
  review learnings skills now has a stable ID, so a review finding can name
  the exact rule.
- **Only the reference a change needs.** Each skill maps changed files and
  diff lines to the reference to read, and its `SKILL.md` shows that as a
  table. A service that memoizes now loads the Symfony reference, and queued
  work loads the performance reference.
- **Already enforced by CI.** The testing, core, plugin, Administration and
  review learnings skills list the checks CI already runs, with what each
  catches and misses, so reviews flag only the gaps.
- **Event tests.** `shopware-testing` shows how to observe events: an owned
  `CollectingEventDispatcher` in unit tests or `EventHookDispatcher::on()` in
  integration tests. Capture first, assert afterwards, and never add
  listeners to the shared dispatcher.
- **Deprecated exceptions.** `shopware-core-development` covers
  `Feature::throwIfActive()` for deprecated exception classes and framework
  callbacks, and neutral return values for discovery methods.
- **OpenSearch per lane.** In `shopware-podman-dev`, OpenSearch is opt-in per
  lane. The skill says when a task needs it and how to turn it on for one
  lane without starving the shared Podman VM.

### Changed

- References that depend on the task rather than the diff, such as "when
  stuck" and the docs map, load only on demand, and the routing tables are
  about 15% shorter.
- `shopware-plugin-development` runs large data changes in ordered batches
  and sends derived data to an indexer or `PostUpdateIndexer`, instead of
  doing heavy work in `update()` or a command.
- `shopware-core-development` asks for one marker per surface (`@internal`,
  `@experimental`, `@final` or a final class) instead of "prefer `final`
  over `@internal`".
- `shopware-testing`: the one-covers-class rule applies to every added or
  changed test file.

### Fixed

- `shopware-admin-js` no longer tells you to write `acl_role.privileges`
  with SQL, and no longer claims that Admin flag names must be uppercase.
  Both contradicted the core review guides.

### For contributors

- Review evals: catch and ignore pairs for each new rule, and near-miss
  tasks that fail when a finding cites a rule that does not cover it.
- Real model evals in CI on a free OpenCode model, sharded, gated and with
  a monthly baseline PR; they track skill loads and token use. The weekly
  eval workflow no longer reports success while skipping every step.
- `scripts/eval-local.sh` runs the A/B with a CLI you are logged in to;
  runs retry agent errors and score completed runs only.
- Repo tooling, the eval runner, the adapters and all task graders moved
  to TypeScript in `tools/`, with strict lint and format in CI.
- A weekly job reports drift on Shopware trunk guidelines as an issue, and
  catalog entries map core review-guide IDs to our rules.
- Two grader fixes, a stricter Admin ACL migration task, a new roadmap
  under `docs/plans/` and a mining pass in the alignment doc.

## [0.8.0] - 2026-10-14

This release makes skills open on the sentence that starts the work, so
the right skill loads for a bug fix, a public API change or a pull
request. It also brings the rules in line with core trunk as of
2026-10-13 and fixes wrong A/B steps in the local validation guide.

### Changed

- **Skills open on the first sentence.** Descriptions now say in plain
  prose when a skill applies, and each reference index says when to read
  which file. A private core bug fix stays with the core PHP skill, while
  `shopware-core-development` opens for a public API, a deprecation, the
  PHPStan baseline or a `RELEASE_INFO` entry.
- **Clearer hand-offs between skills.** `shopware-change-impact` opens
  when the next step is a commit or a PR, and `shopware-security` for a
  route, controller, ACL, webhook or secret. On trunk, a plain "add a
  test" or "open the PR" stays with the core skill for that job.
- **Architecture for new or fragile structures.** `shopware-architecture`
  opens when a change adds a new structure, or can break an existing one
  without the diff showing it, and when the choice is between an event, a
  decoration or a core edit. Writing the ADR stays with
  `shopware-core-development`.
- **Synced with core trunk.** Rules were checked against trunk as of
  2026-10-13, including pull requests merged after 2026-09-28 and open ones
  to watch.
- **License and Codex metadata.** Every skill declares the MIT license in
  its frontmatter, as core trunk skills do, and has Codex interface
  metadata.

### Fixed

- **Correct A/B steps.** The [local validation guide](docs/local-validation.md)
  no longer tells you to run `npx skills disable` or `enable`, which the
  skills CLI does not have. It now uses `npx skills remove` and the pinned
  `add` instead.
- **Changelog gaps.** The sections and compare links for v0.4.0, v0.5.0
  and v0.6.0 were missing.
- **Tidier descriptions.** Stray spaces are gone from the Administration
  and Storefront skill descriptions, and the README describes
  `shopware-core-development` the way its description does.

### For contributors

- A Claude activation adapter and three new evals: support replies in one
  block, review triage with confidence, and linked projects that run in a
  container. All three helped in two Claude A/B rounds.
- The Claude activation adapter and runner now fail on CLI or API errors
  instead of scoring them as "no skill selected", and activation prompts no
  longer show routing notes to the model.
- `validate-skills.sh` accepts a description that quotes no trigger
  phrase.

## [0.7.0] - 2026-10-02

This release adds skills for the Storefront, the Administration and
checking a change's impact before you ship it. It helps you prepare a
plugin for Shopware 6.8 and brings many new rules from core trunk. Most of
the work behind it went into stricter evals, so the skills are measured
against real mistakes.

### Added

- **Storefront and Administration skills.** `shopware-storefront` and
  `shopware-admin-js` cover Storefront and Administration work, with a
  [Storefront use case](use-cases/storefront-development.md) to install
  them.
- **Impact check before you ship.** The new `shopware-change-impact` skill
  reviews a working feature before you call it done: shared HTTP cache,
  checkout cost for shops that do not use the feature, assets tested only
  on a local disk, and container differences per feature flag. It ends
  with ship, narrow the design, or do not ship.
- **Preparing a plugin for 6.8.** The skills keep the supported
  `composer.json` range, test with `V6_8_0_0=1` rather than `FEATURE_ALL`,
  and call out changes that still compile but behave differently, such as
  the cache rework, cart tax cents, document generation v2 and flows.
- **Twig 4 and the Vue SFC API.** Storefront templates drop `spaceless`
  and null HTML attributes for Twig 4. Administration Twig overrides are
  not rewritten to the experimental Vue SFC API
  ([shopware/shopware#21162](https://github.com/shopware/shopware/discussions/21162)).
- **Modern Web Guidance lookup.** Generic CSS, HTML and JavaScript
  questions can use Modern Web Guidance as an optional CLI lookup, but only
  when Shopware has no primitive for it. It is not installed as a skill.
- **More rules from core trunk.** Rules mined from trunk up to 2026-09-28
  cover BC-change attributes, one `CoversClass` per test file, Symfony
  `Filesystem`, named arguments, release note headings, no AI trailers in
  PRs, and typed extension events for new Store API routes.

### Changed

- **Plugin services in PHP.** Plugins that target 6.8 configure services
  with PHP `ContainerConfigurator` instead of `services.xml`; `config.xml`
  stays XML.
- **Feature flags across two majors.** Unit tests disable the newer major
  flag, and integration tests run one lane per `FEATURE_ALL` major.
- **Running things locally.** The skills use Podman on a linked
  shopware-dev setup and `shopware-cli` on CLI projects. A missing MCP
  server never blocks the fallback.
- **Admin SDK for apps.** The app use case no longer sends Meteor Admin
  SDK work to `shopware-admin-js`.

### Removed

- **Storefront CSRF advice.** The `sw_csrf` guidance is gone, since
  Shopware dropped it in 6.5.

### Fixed

- **Files vanishing in Podman lanes.** `shopware-podman-dev` explains that
  files created in the container, such as webpack builds or `.env.local`,
  vanish because the lane syncs one way. It shows how to check the sync
  mode and how to fix a fresh lane whose Storefront has no CSS.
- **Trunk overlay keeps core skills.** `sw-dev link` no longer replaces
  core skills tracked in git, or `.claude/skills` when it points to
  `.agents/skills`. Cursor and Codex still get our Administration overlay.

### For contributors

- Over 25 new eval tasks for the new rules, plus evals for the 6.8, Twig
  4, SFC and impact-check guidance.
- Six rounds of grader fixes after Copilot reviews: graders strip comments,
  scope checks to the right method or block, and each has an almost-pass
  fail fixture. `AGENTS.md` documents these grader rules.
- `test-graders.sh` runs both the start fixture and the fail fixture.

## [0.6.0] - 2026-07-28

This release adds skills for architecture and security decisions and
explains how this library works next to the skills that ship with core
trunk. Testing rules are now in sync with core.

### Added

- **Architecture and security skills.** `shopware-architecture` and
  `shopware-security` join the library.
- **Core skills come first on trunk.** In a trunk checkout, the core
  `.agents/skills/` folder is the main source and this library adds to it.
  See [skill resolution](docs/skill-resolution.md).
- **Testing rules from reviews.** New core testing rules come from pull
  request feedback, including the `#[Package]` attribute on test classes.

### Changed

- **Synced with core trunk.** The testing rules match core trunk, and the
  README install example is pinned to v0.6.0.

### For contributors

- New eval for the test class `#[Package]` rule, refreshed smoke eval
  defaults and markdown lint fixes.

## [0.5.0] - 2026-06-23

This release brings the skills in line with the rules core developers
wrote down in core trunk, and adds checks to run before you submit a pull
request.

### Added

- **Rules from core trunk.** The skills now follow the rules collected in
  core pull request
  [shopware/shopware#17657](https://github.com/shopware/shopware/pull/17657).
  See the [alignment notes](docs/core-pr-17657-alignment.md).
- **Checks before you submit.** `shopware-review-learnings` adds
  pre-submit quality checks, a checklist for refactoring an interface, and
  patterns for `Feature` flags.

### For contributors

- Eval tasks for the rules taken from core trunk.

## [0.4.0] - 2026-06-19

This release helps you use Symfony instead of writing your own code.
Most other changes make it easier to test the skills locally and in CI.

### Added

- **Use what Symfony already has.** Plugin code uses a Symfony component
  instead of hand-rolled code when the supported Shopware version ships
  it. Core code keeps the old path behind a feature flag until the next
  major.

### For contributors

- A local smoke eval harness, harder behavioral tasks, and a core eval
  task for the Symfony guidance.
- A ShellCheck CI job and golden grader fixtures, with both CI jobs
  repaired after they broke.
- Cursor smoke evals work with a browser login.
- Markdown lint fixes for code block languages and bare URLs.

## [0.3.0] - 2026-06-18

This release teaches the skills the PHP and testing habits that core trunk
uses, so code and tests written with them look like core code. Plugin work
picks up the same habits.

### Added

- **Platform architecture.** `shopware-core-development` explains which
  bundle owns what, the line between Core and Storefront, event listeners
  versus subscribers, `final` classes, the session and migrations.
- **Trunk PHP habits.** `php-foundation` covers the habits core trunk
  follows: no `empty()`, interfaces for dependency injection, the PSR
  clock, and careful `@var` annotations.
- **Trunk testing rules.** `shopware-testing` puts unit tests first and
  follows the trunk PHPUnit rules, such as `expectExceptionObject`, no
  `#[Depends]`, no `any()` on mocks, and a clock in tests.
- **New review findings.** `shopware-review-learnings` adds findings on
  the form of ACL constants and on destructive migrations.

### Changed

- **Plugins follow the trunk habits.** `shopware-plugin-development` takes
  over the trunk PHP habits and points to thin controllers and OpenAPI.
- **Destructive migrations.** The plugin migration guidance says what goes
  into `updateDestructive()`: dropping data belongs there, never in
  `update()`.

## [0.2.0] - 2026-06-11

This release adds skills for writing and reviewing pull requests, a
house style for answers, and an optional skill to run commands in a
Podman dev setup. It also adds more review findings and testing patterns.

### Added

- **Pull request skills.** `shopware-pr-description` writes the pull
  request body for a Shopware contribution, and `shopware-pr-review` helps
  you react to review comments.
- **Assistant style.** `shopware-assistant-style` keeps answers plain and
  short, without filler, and makes support replies ready to copy.
- **Podman dev setup (optional).** `shopware-podman-dev` runs PHP,
  Composer, PHPUnit and console commands inside Podman with Mutagen and the
  `~/shopware-dev` hub, never on the host.
- **More review findings.** `shopware-review-learnings` adds a pre-submit
  checklist for CI, PR size and self-review, Shopware-specific red flags,
  and findings on OpenAPI schemas and thin controllers.
- **Testing patterns.** `shopware-testing` points to the FriendsOfShopware
  `shopware-phpunit` skill for plugin-heavy test patterns.
- **Tooling guide.** The [tooling stack guide](docs/tooling-stack.md)
  explains how this library works next to Shopware's AI coding tools and
  MCP servers.

### Changed

- **Release notes and ADRs.** The guidance on release notes and ADRs in
  `shopware-core-development` is longer and replaces the former changelog
  rule.
- **Installing with sw-dev.** The README and Podman docs recommend
  `sw-dev link` as the way to install.

### For contributors

- `.gitignore` covers `skills-lock.json` and `.agents/`, which
  `npx skills add` creates.

## [0.1.0] - 2026-06-03

The first release of a Shopware skills library that works with any agent.
It installs into Cursor, Claude Code, Codex and OpenCode, and ships skills
for core, plugin and app development, testing, PHP style and research.

### Added

- **Skills by what you edit.** `shopware-core-development` covers the
  platform, `shopware-plugin-development` PHP plugins and projects, and
  `shopware-app-development` apps. Each picks itself by the path or file
  you work on, so all three can live in one monorepo.
- **App development.** `shopware-app-development` covers the manifest with
  least-privilege permissions, sandboxed Twig app scripts, webhooks with
  the Admin API, and the Meteor Admin SDK.
- **Shared PHP style.** `php-foundation` follows PER-CS and keeps the
  PHPStan baseline in check, aligned with Shopware.
- **Testing.** `shopware-testing` sets the standards for PHPUnit unit and
  integration tests.
- **Review learnings.** `shopware-review-learnings` collects findings from
  real reviews, starting with a few seeded entries.
- **Research and escalation.** `shopware-research-and-escalation` maps the
  docs, says when to use Context7, and what to do when you are stuck.
- **Install recipes.** The `use-cases/` folder has one install recipe each
  for plugin, app and core development.
- **Further reading.** The core, plugin and app skills link the real
  Shopware docs, and the core deprecations reference covers the
  `@feature-deprecated` and `@major-deprecated` annotations.

### For contributors

- An eval suite with activation evals per skill, behavioral fixture tasks,
  and an A/B runner with optional Harbor wiring.
- Scripts to check for updates, validate skills and run activation evals.

[Unreleased]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.20.0...main
[0.20.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.19.0...v0.20.0
[0.19.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.18.0...v0.19.0
[0.18.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.17.0...v0.18.0
[0.17.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.16.0...v0.17.0
[0.16.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.15.0...v0.16.0
[0.15.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/BrocksiNet/ai-skills-shopware/releases/tag/v0.1.0
