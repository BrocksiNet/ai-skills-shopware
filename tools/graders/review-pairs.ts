// Graders of the review pairs: `review-<topic>-catch` runs `reviewCatch` with
// the entry, `review-<topic>-ignore` runs `reviewIgnore` with the entry's
// `rule` and `summary`, or with `ignore` when the clean fixture needs its own.
// tools/src/grade/run.ts looks a task up here when tools/graders/<task>.ts does
// not exist; a pair whose grader needs more than one call keeps its own files.
// One table, no logic, so lint's max-lines is off for this file only.
import type { Expectation, IgnoreExpectation } from '../src/findings.ts';

export interface ReviewPair extends Expectation {
  ignore?: IgnoreExpectation;
}

export const PAIRS: Record<string, ReviewPair> = {
  // Catch: A new Loyalty settings card loads and saves through systemConfigApiService,
  // so the plugin's role mapping now grants system_config:read and
  // system_config:update. That lets a loyalty user read and change every
  // extension's settings, secrets included. Needs a major+ finding in the
  // plugin sources that names ADM-043 or describes the system_config grant.
  // Ignore: The settings card goes through the plugin's own Admin API route, guarded by
  // swag_loyalty.viewer and swag_loyalty.editor, which reads and writes only
  // SwagLoyalty.config keys; the role mapping adds swag_loyalty_tier:read only.
  // SystemConfigService in the controller is fine. A minor+ finding that names
  // ADM-043 or claims the role exposes system_config or all config domains is
  // a false positive.
  'acl-system-config': {
    rule: 'ADM-043',
    file: 'src/**',
    minSeverity: 'major',
    summary:
      /system[_ .-]?config(uration)?[ _]?(:|privileges?|permissions?|read|update|acl|access|values|settings|entries|api)|system_config\b|every (extension|plugin|app|config)\S*\s+(settings|config|configuration|values)|(all|any|other) (config(uration)? )?domains|(all|other|every) (extensions?|plugins?|apps?)\W{0,2}s?\W? (settings|config|configuration|secrets?|api keys?|credentials?)|(secrets?|api keys?|credentials?|passwords?)[^.]{0,40}(other|every|all) (extensions?|plugins?|apps?)/iu,
  },
  // Catch: The settings module builds its components with Component.register and
  // Twig blocks. The change adds a Vue SFC to it, which has no block for other
  // extensions to extend and gives the module a second way to build a component.
  // Needs a minor+ finding that names ADM-006 or describes the mismatch in the
  // Administration sources.
  // Ignore: The module already renders a Vue SFC (the tier hint), so a second SFC added
  // the same way follows the area's pattern. A minor+ finding that names ADM-006
  // or calls the SFC a break is a false positive.
  'admin-area-pattern': {
    rule: 'ADM-006',
    file: 'src/Resources/app/administration/**',
    minSeverity: 'minor',
    summary: /\.vue\b|single[- ]file|\bSFC\b|component factory|Component\.register|\bTwig\b|\bblocks\b/iu,
  },
  // Catch: SwagCustomerInsights 3.3.0 allows shopware/core ~6.6.0 || ~6.7.0 and
  // overrides block sw_customer_base_metadata_default_payment of
  // sw-customer-base-info. Core removed the block (with the default payment
  // method) in 6.7.0.0, so on 6.7 the last used payment method never shows.
  // Needs a major+ finding in the admin sources that names PLG-001 or
  // describes the block missing in 6.7. No skill names the block.
  // Ignore: The same change, but composer.json requires shopware/core ~6.6.0, and
  // every 6.6 release has the block. A minor+ finding that names PLG-001 or
  // calls the block missing in 6.7 is a false positive.
  // A note that core deprecates it for removal in 6.7 is true and fine: the
  // facts list the deprecation, and new code should plan the migration.
  'admin-block-range': {
    rule: 'PLG-001',
    file: 'src/Resources/app/administration/src/**',
    minSeverity: 'major',
    summary:
      /(remov|no longer (exist|ship|render|load|regist)|(does not|doesn't|did not) exist|missing|gone|dropped|not registered)(?:[^.]|\.\S){0,80}6\.7|6\.7(?:[^.]|\.\S){0,80}(remov|no longer|(does not|doesn't) exist|missing|gone|drop|not registered|silently)/iu,
    ignore: {
      rule: 'PLG-001',
      summary:
        /^(?!.*deprecat).*?(?:(remov|no longer (exist|ship|render|load|regist)|(does not|doesn't|did not) exist|missing|gone|dropped|not registered)(?:[^.]|\.\S){0,80}6\.7|6\.7(?:[^.]|\.\S){0,80}(remov|no longer|(does not|doesn't) exist|missing|gone|drop|not registered|silently))/iu,
      allowed: [
        {
          rule: 'PLG-001',
          file: 'src/**',
          minSeverity: 'minor',
          summary: /(?=.*sw_customer_base_metadata_default_payment)(?=.*deprecat)(?=.*6\.7)/iu,
        },
      ],
    },
  },
  // Catch: SwagLoyalty supports Shopware 6.5 and 6.6. The change adds an
  // sw-switch-field and an sw-single-select bound with :value and @change.
  // 6.6 fields emit only update:value, so the handlers never run and the
  // settings are not saved. Needs a major+ finding in the Administration
  // sources that names ADM-044 or describes the dead change event.
  // Ignore: The change adds the same two fields bound with v-model:value, which works
  // on 6.5 (falls back to the change event) and 6.6 (update:value). A minor+
  // finding that names ADM-044 or calls the binding broken is a false
  // positive.
  'admin-field-event': {
    rule: 'ADM-044',
    file: 'src/Resources/app/administration/**',
    minSeverity: 'major',
    summary:
      /update:value|@change|\bchange\b[^.]{0,20}\bevent|\b6\.6\b|never (fires?|runs?|(gets? |is )?(emitted|called|triggered))|(is|are) not emitted|v-model:value|(does not|doesn't|do not|don't|never) (update|save|persist)/iu,
  },
  // Catch: The flag-off branch of pointsFor goes through roundPoints(…, 'down'), and
  // that helper truncates toward zero, so refunds (negative amounts) earn other
  // points with the flag off. Needs a major+ finding in the Administration
  // sources that names ADM-025 or describes the changed flag-off path.
  // Ignore: The flag branch uses the new rounding and the flag-off branch keeps
  // Math.floor, so nothing changes without the flag. A minor+ finding that names
  // ADM-025 or calls the flag-off path changed is a false positive.
  'admin-flag-old-branch': {
    rule: 'ADM-025',
    file: 'src/Resources/app/administration/**',
    minSeverity: 'major',
    summary:
      /legacy|\bold (branch|behaviou?r|path|code)\b|\belse (branch|path)\b|flag[- ]?(off|disabled)|(flag|feature) (is )?(off|disabled)|keep the old/iu,
  },
  // Catch: The change registers the real sw-block in config.global.components while
  // the same key stays in config.global.stubs. Vue Test Utils skips
  // app.component() for keys that also appear in stubs, so specs keep the stub.
  // Needs a major+ finding in the test setup that names ADM-036 or describes
  // the skipped registration.
  // Ignore: The change registers the real sw-block through config.global.stubs, which
  // is the compliant form. It looks like the catch diff but names no conflict.
  // A minor+ finding that names ADM-036 or calls the stub registration broken
  // is a false positive.
  'admin-global-stub': {
    rule: 'ADM-036',
    file: 'src/Resources/app/administration/test/_setup/prepare_environment.js',
    minSeverity: 'major',
    summary:
      /\bstubs?\b[^.]{0,80}\bcomponents?\b|\bcomponents?\b[^.]{0,80}\bstubs?\b|\bstubbed\b|\bskips?\b|\bskipped\b|\bskipping\b|app\.component|\bnever (registered|rendered)\b/iu,
  },
  // Catch: The change adds shared loyalty-points state and loader as a new mixin
  // registered with Mixin.register() and used by a badge component. The rule
  // asks for a composable instead. Needs a minor+ finding in the Administration
  // sources that names ADM-007 (or ADM-017, which says the same) or calls the
  // new shared logic a mixin.
  // Ignore: The change adds the same loyalty-points state and loader as a composable
  // (useLoyaltyPoints) called from setup(), which the rule asks for. A minor+
  // finding that names ADM-007 (or ADM-017) or calls the composable a mixin is
  // a false positive.
  'admin-mixin': {
    rule: 'ADM-007',
    also: ['ADM-017'],
    file: 'src/Resources/app/administration/**',
    minSeverity: 'minor',
    summary: /\bmixins?\b/iu,
    ignore: {
      rule: 'ADM-007',
      also: ['ADM-017'],
      summary: /\bmixins?\b/iu,
    },
  },
  // Catch: The plugin overrides sw-order-list to add a loyalty points column. Its
  // orderCriteria calls this.$super, but getOrderColumns copies the core column
  // list and appends one entry without calling this.$super, so columns from
  // other plugins' overrides and later core changes are dropped. Needs a major+
  // finding in the plugin sources that names ADM-042 or describes the copy.
  // Ignore: The override of sw-order-list starts from this.$super for orderCriteria
  // and getOrderColumns and only inserts the loyalty points column. A minor+
  // finding that names ADM-042 or says the override drops core or other
  // plugins' columns is a false positive.
  'admin-override-super': {
    rule: 'ADM-042',
    file: 'src/**',
    minSeverity: 'major',
    summary:
      /(does ?n[o']?t|never|without|missing|no|instead of|skips?|bypass\w*)\W+(call(s|ing)?\W+)?(this\.)?\$?super\b|cop(y|ies|ied|ying)[^.]{0,60}(core|original|parent)|duplicat\w*[^.]{0,60}(core|original|parent)|replac\w* the (core|original|parent|whole)\b[^.]{0,40}(method|implementation|columns)|(other|later|third.party) (plugins?|extensions?|apps?|overrides?)\b[^.]{0,80}(skip|lost|lose|drop|bypass|ignor|overwrit|break|miss)|(skip|lose|drop|bypass|ignor|overwrit)\w*[^.]{0,60}(other|later|third.party) (plugins?|extensions?|apps?|overrides?)|(future|upstream|later) (core )?(\w+ )?(changes|fixes|updates|columns)/iu,
  },
  // Catch: The released detail page renames the swag-loyalty-detail-sidebar position
  // identifier and its blocks-list.json entry. Apps and plugins that render
  // into the old identifier silently disappear. Needs a major+ finding in the
  // Administration sources that names ADM-040 or describes the breaking rename.
  // Ignore: The change adds a new swag-loyalty-detail-history position identifier and
  // its blocks-list.json entry, and keeps swag-loyalty-detail-sidebar. A minor+
  // finding that names ADM-040 or calls it a breaking change is a false positive.
  'admin-position-identifier': {
    rule: 'ADM-040',
    file: 'src/Resources/app/administration/**',
    minSeverity: 'major',
    summary:
      /renam|remov|no longer (exist|render)|deprecat|position.?identifier[^.]{0,80}(chang|break)|(apps?|plugins?|extensions?)\b[^.]{0,80}(break|fail|stop|lose|disappear|no longer)|backward.?compat|\bBC\b|breaking/iu,
  },
  // Catch: SwagLoyalty supports 6.6 and 6.7. The change adds a tiers module whose
  // addPrivilegeMappingEntry passes a flat privileges object instead of roles
  // with privileges and dependencies per role. isPrivilegeMapping checks only
  // category, parent and key, so the entry registers and the role screens
  // throw a TypeError. Needs a major+ finding in the Administration sources
  // that names ADM-004 or describes the wrong shape.
  // Ignore: The same tiers module registers roles with privileges and dependencies per
  // role (editor depends on the viewer), which is the shape the role screens
  // read. A minor+ finding that names ADM-004 or calls the mapping malformed
  // is a false positive.
  'admin-privilege-shape': {
    rule: 'ADM-004',
    file: 'src/Resources/app/administration/**',
    minSeverity: 'major',
    summary:
      /\broles\b|isPrivilegeMapping|TypeError|\bdependencies\b|\bflat\b|(mapping|privileges?)[^.]{0,40}(shape|structure|format)|(shape|structure|format)[^.]{0,40}(mapping|privileges?)|wrong (key|property)/iu,
  },
  // Catch: The released swag-loyalty-card component renames its customerId prop to
  // customer, adds a required salesChannelId prop and renames the
  // swag_loyalty_card_points block. Plugins that pass customerId or override
  // the block break. Needs a major+ finding in the Administration sources that
  // names ADM-039 or describes the breaking prop or block change.
  // Ignore: The change adds an optional showTier prop with a default and a new
  // swag_loyalty_card_tier block, and keeps every existing prop and block.
  // A minor+ finding that names ADM-039 or calls it a breaking change for
  // plugins is a false positive.
  'admin-prop-removed': {
    rule: 'ADM-039',
    file: 'src/Resources/app/administration/**',
    minSeverity: 'major',
    summary:
      /renam|remov|no longer (exist|accept|render)|deprecat|breaks? (plugins?|overrides?|extensions?|callers?|existing)|(plugins?|overrides?|extensions?|existing (usages?|callers?))\b[^.]{0,80}(break|fail|stop|lose|miss)|required prop|now required|backward.?compat|\bBC\b|breaking/iu,
  },
  // Catch: The change clears four store fields by hand in created() and keeps a copy
  // of the store's campaign in data(). The store has $reset(), and the copy
  // goes stale when the store changes. Needs a major+ finding in the
  // Administration sources that names ADM-045 or describes the hand reset or
  // the stale copy.
  // Ignore: The change calls the store's $reset() once when the page is created and
  // reads campaign through the store computed. That is the store's own reset,
  // with no local copy. A major+ finding that names ADM-045 or calls the reset
  // wrong is a false positive.
  'admin-store-reset': {
    rule: 'ADM-045',
    file: 'src/Resources/app/administration/**',
    minSeverity: 'major',
    summary: /\$reset|\breset\b|one (by )?one|by hand|local copy|copy of (the )?store|stale/iu,
  },
  // Catch: SwagLoyalty requires shopware/core ~6.7.0. The change adds
  // build/webpack.config.js with an @loyalty alias and a component importing
  // from it. 6.7 builds the Administration with Vite and does not read the
  // webpack config, so the alias does nothing and the import fails. Needs a
  // major+ finding in the Administration sources that names ADM-009 or
  // describes the ignored config.
  // Ignore: The same alias and import, but SwagLoyalty requires ~6.6.0, where the
  // Administration still builds with webpack and reads build/webpack.config.js.
  // A minor+ finding that names ADM-009 or calls the webpack config ignored is
  // a false positive; other remarks (such as TypeScript) are not.
  'admin-webpack-config': {
    rule: 'ADM-009',
    file: 'src/Resources/app/administration/**',
    minSeverity: 'major',
    summary: /\bvite\b|webpack[^.]{0,60}(ignored|not (used|read|loaded|picked up)|no (effect|longer))|\b6\.7\b/iu,
    ignore: {
      rule: 'ADM-009',
      summary: /\bvite\b|webpack[^.]{0,60}(ignored|not (used|read|loaded|picked up)|no (effect|longer))|\b6\.7\b/iu,
      allowed: [
        {
          rule: 'ADM-041',
          file: 'src/Resources/app/administration/src/component/**',
          minSeverity: 'minor',
          summary: /TypeScript|plain JavaScript/iu,
        },
      ],
    },
  },
  // Catch: A new Store API route opts out of the OpenAPI schema with `openapi => false`,
  // so ApiRoutesHaveASchemaTest never sees it. Needs a major+ finding in src/Core/
  // that names CORE-009 (or CORE-008, the schema rule next to it), or says the
  // schema test cannot cover the route.
  // Ignore: The route is covered by the schema test (no openapi opt-out) and its
  // StoreApi/paths schema is in the diff. It only looks like the catch case, so
  // any finding above nit that names CORE-009 (or CORE-008) or the schema test is
  // a false positive.
  'api-route-schema-test': {
    rule: 'CORE-009',
    also: ['CORE-008'],
    file: 'src/Core/**',
    minSeverity: 'major',
    summary:
      /ApiRoutesHaveASchemaTest|schema test|schema coverage|not (covered|checked) by (the |any )?(schema )?test/iu,
    ignore: {
      rule: 'CORE-009',
      also: ['CORE-008'],
      summary:
        /ApiRoutesHaveASchemaTest|schema test|schema coverage|not (covered|checked) by (the |any )?(schema )?test/iu,
    },
  },
  // Catch: The new test pins forCustomer() with assertEquals(120, ...), which still
  // passes once the method returns the ledger's string '120'. Needs a minor+
  // finding in tests/ explaining how loose equality hides the scalar type change.
  // Ignore: The scalar is pinned with assertSame; the entries list is an array, which the
  // rule does not cover, so assertEquals there is correct. A minor+ finding that
  // names TEST-018 or calls the array assertion loose is a false positive.
  'assert-same-scalar': {
    rule: 'TEST-018',
    file: 'tests/**',
    minSeverity: 'minor',
    summary: /assertEquals|loose|strict|assertSame|type change|type[^.]{0,60}(unnoticed|miss|check)/iu,
    allowed: [
      {
        rule: 'PLG-027',
        file: 'src/**',
        minSeverity: 'minor',
        summary: /forCustomer|ledger|cast|Store API[^.]{0,60}string/iu,
      },
    ],
    ignore: {
      rule: 'TEST-018',
      summary: /assertEquals|loose|scalar/iu,
    },
  },
  // Catch: ThemeCompiler::compile() deletes the previous theme directory in the same
  // step that switches the hash. Pages cached before the switch still request
  // the old URLs, so the delete belongs in a scheduled task or message handler.
  // Needs a major+ finding in src/Storefront/ that names CORE-077 or describes the
  // synchronous delete. Another catalog ID does not count: the timing is the point.
  // Ignore: The same compile step retires the old hash, and a message handler deletes
  // its directory after a seven-day grace period. Nothing runs in the switch
  // path, so a minor+ finding that names CORE-077 or calls the delete synchronous
  // is a false positive.
  'asset-cleanup': {
    rule: 'CORE-077',
    file: 'src/Storefront/**',
    minSeverity: 'major',
    summary:
      /synchron|right after|immediately after|same (request|command|compile|deploy)|in the (command|request|compile|deploy) (step|path)/iu,
    ignore: {
      rule: 'CORE-077',
      summary: /synchron|right after|immediately after|in the (command|request|compile|deploy) (step|path)/iu,
    },
  },
  // Catch: The class becomes final, an extender break that BecomesFinal names exactly.
  // ClassHierarchyChange is the broader attribute. A minor+ finding in src/Core/
  // that names CORE-014 or calls the attribute too general or the wrong one passes.
  // Ignore: The same planned break, with BecomesFinal, the most specific attribute for a
  // class that becomes final. A finding above nit that names CORE-014 or calls
  // the attribute wrong is a false positive.
  'bc-change-most-specific': {
    rule: 'CORE-014',
    file: 'src/Core/**',
    minSeverity: 'minor',
    summary: /ClassHierarchyChange|BecomesFinal|most specific|specific attribute|more specific|too general/iu,
    ignore: {
      rule: 'CORE-014',
      summary: /ClassHierarchyChange|BecomesFinal|most specific|specific attribute|more specific/iu,
    },
  },
  // Catch: A new response subscriber marks every page private and no-store for
  // logged-in customers so the points badge is right. It bypasses the cache
  // policies and makes every page of every logged-in customer uncached. Needs
  // a major+ finding in src/ that names SF-013 or describes switching caching
  // off for logged-in customers.
  // Ignore: The balance moves out of the cached page into a JS plugin that loads it
  // from the Store API after paint; the page stays cacheable. A minor+
  // finding that names SF-013 or says caching is switched off is a false
  // positive.
  'cache-disabled-for-logged-in': {
    rule: 'SF-013',
    file: 'src/**',
    minSeverity: 'major',
    summary:
      /no-store|cache-control|private|disabl\w* (the )?(http |page )?cach|cach\w* (is )?(disabled|switched off|turned off|bypassed)|bypass\w* (the )?(http |page )?cach|uncached|cache polic|logged.in[^.]{0,80}cach|cach\w*[^.]{0,80}logged.in/iu,
  },
  // Catch: The new cache key holds only the product id, but the result depends on
  // the limit, sales channel, language and customer group. One caller gets
  // another caller's recommendations. Needs a major+ finding in src/ that
  // names IMP-008 or describes the incomplete cache key.
  // Ignore: The cache key hashes every input (product, limit, sales channel, language,
  // currency, customer group). A minor+ finding that names IMP-008 or calls
  // the key incomplete is a false positive.
  'cache-key-missing-input': {
    rule: 'IMP-008',
    file: 'src/**',
    minSeverity: 'major',
    summary:
      /cache key|(key|cache)[^.]{0,80}(missing|lacks?|without|ignores?|omits?|leaves? out|only (uses|contains|includes|the product))|(missing|lacks?|without|ignores?|omits?)[^.]{0,80}(sales.?channel|language|limit|customer group|currency)[^.]{0,40}(key|cache)|wrong (result|recommendations?|products?) (for|to)|(another|other|different) (sales.?channels?|languages?|customer groups?|callers?)|cross.?(sales.?channel|language)|leak/iu,
  },
  // Catch: SwagLoyalty requires shopware/core ~6.7.0. The change adds a subscriber
  // to ProductDetailRouteCacheTagsEvent that tags the product with its loyalty
  // badge, and a writer that invalidates that tag. 6.7 removed Store-API route
  // caching: the event still exists but is never dispatched, so the tag never
  // reaches the HTTP cache. Needs a major+ finding in the plugin sources that
  // names PLG-007 or describes the dead event.
  // Ignore: The same badge feature on ~6.7.0, but the product page subscriber
  // dispatches AddCacheTagEvent, which reaches the HTTP cache from 6.6.6.0 on, and
  // the writer invalidates the same tag. A minor+ finding that names PLG-007
  // or calls the tagging dead is a false positive.
  'cache-tags-event': {
    rule: 'PLG-007',
    file: 'src/**',
    minSeverity: 'major',
    summary:
      /deprecat|no longer (dispatched|fired|used)|never (dispatched|fires|runs|called|triggered)|CacheTagCollector|AddCacheTagEvent|route cach(e|ing) (was )?removed|\b6\.7\b/iu,
  },
  // Catch: The focused fix is the null check in ShippingCostResolver. The rest of the
  // diff sweeps money formatting into the export and reporting modules, which
  // the bug does not touch. Needs a minor+ finding in src/ that names REV-032 or
  // uses the boyscouting vocabulary the rule is written in.
  // Ignore: The fix adds the same null check and a regression test for it, nothing
  // outside the resolver's path. A minor+ finding that names REV-032 or calls
  // the change a boyscout is a false positive.
  'change-scope': {
    rule: 'REV-032',
    file: 'src/**',
    minSeverity: 'minor',
    summary:
      /\b(boy-?scout\w*|drive-by (refactor|cleanup))\b|unrelated[^.]{0,100}(fix|change)|separate (change|PR|pull request)/iu,
    ignore: {
      rule: 'REV-032',
      summary: /\b(boy-?scout\w*|drive-by (refactor|cleanup))\b/iu,
    },
  },
  // Catch: The diff marks CartNormalizer @codeCoverageIgnore and imports its integration
  // test only so the @see can name it by short name. Needs a minor+ finding that
  // cites TEST-033 on the production file, or one without an ID there that
  // describes the import or the missing leading-backslash FQCN.
  // Ignore: The same class and test, but @see names the test by its leading-backslash
  // FQCN and no import is added. A minor+ finding that cites TEST-033 or objects
  // to the FQCN or the import is a false positive.
  'codecoverage-ignore-see': {
    rule: 'TEST-033',
    file: 'src/**',
    minSeverity: 'minor',
    summary:
      /leading.backslash|fully.qualified|\bFQCN\b|\buse\b.{0,60}(import|statement|annotation|docblock)|(import|\buse\b).{0,60}@see|@see.{0,60}(import|short)|short (class )?name/iu,
  },
  // Catch: SwagProductFeed supports ~6.6.0 || ~6.7.0 and registers a new subscriber
  // behind class_exists(CacheInvalidator::class), with a comment that the class
  // came with the 6.7 cache rework. CacheInvalidator exists in every release
  // since 6.5.0.0, so the guard is always true and the comment is wrong. Needs a
  // minor+ finding in the plugin sources that names REV-015 or describes the
  // dead guard.
  // Ignore: SwagProductFeed supports ~6.6.0 || ~6.7.0 and hashes the feed payload with
  // Hasher behind class_exists(Hasher::class). Hasher arrived in 6.6.7.0, so
  // 6.6.0.0 to 6.6.6.1 take the fallback and the guard is needed. A minor+
  // finding that names REV-015 or calls the guard dead is a false positive.
  'dead-version-guard': {
    rule: 'REV-015',
    file: 'src/**',
    minSeverity: 'minor',
    summary:
      /dead|always (true|exists|available|passes|present)|never (false|fails)|unnecessary|redundant|not needed|no(t a)? need|since 6\.5|every (supported )?(release|version)|(in|on) (both|all) (supported )?(6\.6|minors|releases|versions)|(already|also) (exists|available|present) (in|on) 6\.6/iu,
  },
  // Catch: LegacyProductStockSubscriber is deprecated for the next major. Its
  // getSubscribedEvents() throws once the removal flag is active, where the
  // trunk rule returns a neutral value. PHPStan misses it because the events
  // come from a helper method. Needs a major+ finding in src/Core/ that names
  // CORE-012 or describes the throw in the discovery method.
  // Ignore: The same deprecated subscriber, with getSubscribedEvents() returning [] once
  // the removal flag is active. A minor+ finding that names CORE-012 or calls the
  // neutral return a throw is a false positive.
  'deprecation-discovery-neutral': {
    rule: 'CORE-012',
    file: 'src/Core/**',
    minSeverity: 'major',
    summary: /throw|neutral|discovery|getSubscribedEvents|return \[\]|empty array/iu,
    ignore: {
      rule: 'CORE-012',
      summary: /throw|neutral|discovery|return \[\]|empty array/iu,
    },
  },
  // Catch: ProductIndexingSubscriber::onProductIndexed is deprecated but still called by
  // the dispatcher on every indexing event. triggerDeprecationOrThrow() warns on
  // every legitimate call; the framework-callback row needs throwIfActive().
  // Needs a major+ finding in src/Core/ that names CORE-011 or describes the
  // framework callback that warns on every call.
  // Ignore: The same deprecated subscriber method, with throwIfActive() as the first
  // statement and a public replacement shipped in the same change. A minor+
  // finding that names CORE-011 or says the tools should be swapped is a false
  // positive.
  'deprecation-framework-callback': {
    rule: 'CORE-011',
    file: 'src/Core/**',
    minSeverity: 'major',
    summary: /throwIfActive|framework|subscriber|listener|every (event|run|call)|on every|silent/iu,
    ignore: {
      rule: 'CORE-011',
      summary:
        /triggerDeprecationOrThrow[^.]{0,60}(instead|should|must)|should (call|use) triggerDeprecationOrThrow|mix(es|ing|ed)?\b|both (tools|mechanisms)/iu,
    },
  },
  // Catch: ProductPriceCalculator::calculate() is deprecated with a runtime warning,
  // but its replacement ProductPriceCalculatorV2 is marked @internal, so
  // extensions get a warning they cannot act on. Needs a major+ finding in
  // src/Core/ that names CORE-063 or describes the unusable replacement.
  // Ignore: The same deprecation, with a public replacement class shipped in the
  // same change. A minor+ finding that names CORE-063 or calls the replacement
  // internal or unusable is a false positive.
  'deprecation-internal-replacement': {
    rule: 'CORE-063',
    file: 'src/Core/**',
    minSeverity: 'major',
    summary:
      /@internal|internal|experimental|not (yet )?(usable|available|public)|cannot (use|act|migrate)|can.t (use|act|migrate)|no (usable|public) replacement|replacement[^.]{0,60}(internal|not public|unusable)|silent/iu,
  },
  // Catch: ProductPriceCalculator::calculate() gets a @deprecated tag that only says
  // it will be removed. The runtime message names the replacement; the tag does
  // not. Needs a minor+ finding in ProductPriceCalculator.php that names CORE-017
  // or says the tag lacks the replacement.
  // Ignore: The same deprecation as the catch task, but its @deprecated tag names the
  // replacement. A finding above nit that names CORE-017 or says the tag lacks
  // the replacement is a false positive.
  'deprecation-tag-replacement': {
    rule: 'CORE-017',
    file: 'src/Core/Content/Product/SalesChannel/Price/ProductPriceCalculator.php',
    minSeverity: 'minor',
    summary:
      /(@deprecated|deprecation tag|the tag)[^.]{0,80}(replacement|instead|no replacement)|replacement[^.]{0,60}(not named|unnamed|missing|absent|not stated|not in the tag)|no replacement|does not name/iu,
  },
  // Catch: ProductCollection::getActiveProducts() gets a @deprecated tag, and its
  // replacement filterActive() is public, but the method has no runtime
  // Feature::triggerDeprecationOrThrow(). PHPStan skips collection classes, so
  // the review has to catch it. Needs a minor+ finding in src/Core/ that names
  // CORE-022 or describes the missing runtime trigger.
  // Ignore: The same deprecation as the catch task, with the runtime trigger added as
  // the first statement and naming the replacement. A minor+ finding that names
  // CORE-022 or describes a missing trigger is a false positive.
  'deprecation-trigger': {
    rule: 'CORE-022',
    file: 'src/Core/**',
    minSeverity: 'minor',
    summary:
      /triggerDeprecationOrThrow|runtime (trigger|warning|notice)|no (runtime )?(trigger|warning)|without (a |the )?(runtime )?(trigger|warning)/iu,
  },
  // Catch: The cache factory picks APCu from ini_get() and function_exists(), so web and
  // CLI processes on the same version can run different cache backends. Needs a
  // major+ finding in src/Core/ that names CORE-073 or describes the
  // environment-dependent behaviour.
  // Ignore: The same cache factory, but the APCu choice comes from a documented config
  // key and the factory fails at boot when APCu is requested but not loaded. A
  // minor+ finding that names CORE-073 or describes environment-dependent
  // behaviour is a false positive.
  'environment-probe': {
    rule: 'CORE-073',
    file: 'src/Core/**',
    minSeverity: 'major',
    summary:
      /same version|two (shops|installs)|differ(s|ent)? (between|per) (shops?|installs?|hosts?|servers?|environments?)|environment[- ]dependent|per[- ](host|server|environment)|hosting (setup|variant)/iu,
  },
  // Catch: The test asserts inside the event hook closure. GiftCardRedeemer swallows
  // listener exceptions, so a failing assertion never fails the test. Needs a
  // major+ finding in tests/ that names TEST-016 (or TEST-035, which the
  // review lens lists for the same problem: a test that cannot fail) or
  // describes the problem.
  // Ignore: The test captures the event in the hook and asserts after redeem(),
  // including that the hook fired. A minor+ finding that names TEST-016 (or
  // TEST-035, which the review lens lists for the same problem) or describes
  // assertions in the hook is a false positive.
  'event-hook-assert': {
    rule: 'TEST-016',
    also: ['TEST-035'],
    file: 'tests/**',
    minSeverity: 'major',
    summary:
      /assert\w*[^.]{0,80}\b(hook|closure|callback|listener)|\b(hook|closure|callback|listener)\b[^.]{0,80}assert/iu,
    ignore: {
      rule: 'TEST-016',
      also: ['TEST-035'],
      summary:
        /assert\w*[^.]{0,80}\b(hook|closure|callback|listener)|\b(hook|closure|callback|listener)\b[^.]{0,80}assert/iu,
    },
  },
  // Catch: LoyaltyPointsCalculateEvent drops its public salesChannelId and
  // customerGroupId properties and carries the whole Request instead. Existing
  // listeners break, and the event cannot be built outside an HTTP request
  // (CLI, queue). Needs a major+ finding in src/ that names ARCH-005 or
  // describes the Request payload or the removed properties.
  // Ignore: The event gains an optional campaignCode property next to the existing
  // ones. A minor+ finding that names ARCH-005 or calls the event change
  // breaking is a false positive.
  'extension-event-request-payload': {
    rule: 'ARCH-005',
    file: 'src/**',
    minSeverity: 'major',
    summary:
      /\bRequest\b|request object|whole request|RequestStack|(removed?|renamed?|dropped|drops|replac\w*)[^.]{0,60}(propert|salesChannelId|customerGroupId)|(propert\w*|salesChannelId|customerGroupId)[^.]{0,60}(removed|renamed|dropped|replaced)|listeners?[^.]{0,60}(break|fail)|breaking|backward.?compat|\bBC\b/iu,
  },
  // Catch: The listing reads FEATURE_NEXT_21530 with getenv(), so the Feature registry
  // never sees the flag: a graduated flag is silently off, and Feature::has()
  // is the guard that makes the check safe. Needs a minor+ finding in src/ that
  // names REV-016 or describes the missed Feature::has() guard.
  // Ignore: The listing reads NEXT-21530 through Feature::has() and Feature::isActive(),
  // the pattern the rule asks for. A finding above nit that names REV-016, or
  // claims the flag is read from the environment or bypasses the registry, is a
  // false positive.
  'feature-flag-env': {
    rule: 'REV-016',
    file: 'src/**',
    minSeverity: 'minor',
    summary: /(Feature::has|E_USER_WARNING|unregistered flag|graduat)/iu,
    ignore: {
      rule: 'REV-016',
      summary: /(getenv|\$_SERVER|\$_ENV|environment variable|env var|bypass(es)? the (feature|flag) registry)/iu,
    },
  },
  // Catch: The new docblock tells the story of the pull request: an earlier revision
  // that filtered on `available`, an association removed again in review, an
  // issue number. Needs a minor+ finding in src/ that names REV-034 or
  // describes the history in the comment.
  // Ignore: The docblock states what the method does and why the setting is read per
  // sales channel, and points at its test. A minor+ finding that names
  // REV-034 or calls the comment history is a false positive.
  'history-comment': {
    rule: 'REV-034',
    file: 'src/**',
    minSeverity: 'minor',
    summary:
      /(histor|earlier (version|revision|approach)|previous (version|revision|approach|code)|removed (code|again)|narrat|story|belongs? in the (PR|pull request|commit)|PR (history|story)|stale)/iu,
  },
  // Catch: The Admin API points import replays a stored result for any request with
  // the same Idempotency-Key: the store is keyed by the key alone, with no
  // integration or user and no request-body hash. Another integration that
  // reuses a key gets the first import's customer emails and balances. Needs
  // a major+ finding in src/ that names SEC-008 or describes the unscoped key.
  // Ignore: The same idempotent points import, but the store is keyed by the calling
  // integration or user plus the key and keeps a sha256 of the request body,
  // answering 422 on a mismatch. A minor+ finding that names SEC-008 or calls
  // the replay unscoped or leaking is a false positive.
  'idempotency-key-scope': {
    rule: 'SEC-008',
    file: 'src/**',
    minSeverity: 'major',
    summary:
      /global(ly)?|unscoped|not (scoped|bound|tied)|another (integration|caller|client|user)|other (integrations?|callers?|clients?)|any (integration|caller|client)|(keyed|looked up) only by|only by the (idempotency.)?key|leak|per (integration|caller|client)/iu,
  },
  // Catch: SwagOrderExport 1.3.1 keeps shopware/core ~6.7.0 and reads the payment
  // status from OrderEntity::getPrimaryOrderTransaction(), which arrived in
  // 6.7.1.0. On 6.7.0.0 and 6.7.0.1 every export fails with an undefined
  // method. Needs a major+ finding in the plugin sources that names PLG-001 or
  // describes the missing method. No skill names getPrimaryOrderTransaction():
  // the release comes from the source or api-facts.
  // Ignore: The same change, but composer.json already requires shopware/core
  // >=6.7.1 <6.8, and every allowed release has getPrimaryOrderTransaction().
  // A minor+ finding that names PLG-001 or calls the method missing is a false
  // positive.
  'in-minor-range': {
    rule: 'PLG-001',
    file: 'src/**',
    minSeverity: 'major',
    summary:
      /undefined method|(does not|doesn't|did not) exist|not (available|present) (on|in|before)|missing (on|in|from)|(added|introduced|arrived) (only )?in 6\.7\.1|only (exists )?(from|since|in|on) 6\.7\.1|breaks? .{0,40}6\.7\.0/iu,
  },
  // Catch: The JS plugin renames its showTooltip option to tooltip and its
  // onBadgeRendered event to badgeRendered. Themes that set the option in
  // data-swag-loyalty-badge-options and plugins subscribed to the event
  // silently lose them. Needs a major+ finding in the storefront JS that names
  // SF-011 or describes the rename without deprecation.
  // Ignore: The plugin adds an animate option with a default and keeps every existing
  // option and event. A minor+ finding that names SF-011 or calls it a
  // breaking change for themes is a false positive.
  'js-plugin-option-renamed': {
    rule: 'SF-011',
    file: 'src/Resources/app/storefront/**',
    minSeverity: 'major',
    summary:
      /renam|remov|no longer (read|emit|publish|support)|deprecat|breaks? (themes?|overrides?|extensions?|listeners?|subscribers?)|themes?\b[^.]{0,80}(break|overrid|options?|attribute)|backward.?compat|\bBC\b|breaking|old (option|event|name)/iu,
  },
  // Catch: SwagHoverIntent 2.1.0 allows shopware/core ~6.6.0 || ~6.7.0 and overrides
  // the FlyoutMenu storefront plugin, extending its class from
  // src/plugin/main-menu/flyout-menu.plugin. Core removed FlyoutMenu in
  // 6.7.0.0, so on 6.7 the import fails and the override has nothing to
  // replace. Needs a major+ finding in the storefront sources that names
  // PLG-001 or describes the plugin missing in 6.7. No skill names FlyoutMenu.
  // Ignore: The same change, but composer.json requires shopware/core ~6.6.0, and
  // every 6.6 release registers FlyoutMenu. A minor+ finding that names PLG-001
  // or calls the plugin missing in 6.7 is a false positive.
  // A note that core deprecates it for removal in 6.7 is true and fine: the
  // facts list the deprecation, and new code should plan the migration.
  'js-plugin-range': {
    rule: 'PLG-001',
    file: 'src/Resources/app/storefront/src/**',
    minSeverity: 'major',
    summary:
      /(remov|no longer (exist|ship|render|load|regist)|(does not|doesn't|did not) exist|missing|gone|dropped|not registered)(?:[^.]|\.\S){0,80}6\.7|6\.7(?:[^.]|\.\S){0,80}(remov|no longer|(does not|doesn't) exist|missing|gone|drop|not registered|silently)/iu,
    ignore: {
      rule: 'PLG-001',
      summary:
        /^(?!.*deprecat).*?(?:(remov|no longer (exist|ship|render|load|regist)|(does not|doesn't|did not) exist|missing|gone|dropped|not registered)(?:[^.]|\.\S){0,80}6\.7|6\.7(?:[^.]|\.\S){0,80}(remov|no longer|(does not|doesn't) exist|missing|gone|drop|not registered|silently))/iu,
      allowed: [
        {
          rule: 'PLG-001',
          file: 'src/**',
          minSeverity: 'minor',
          summary: /(?=.*FlyoutMenu)(?=.*deprecat)(?=.*6\.7)/iu,
        },
      ],
    },
  },
  // Catch: SwagCustomerPrices supports ~6.6.0 || ~6.7.0 and registers a subscriber for
  // HttpCacheCookieEvent behind class_exists(), which is right: the class
  // arrived in 6.6.6.0. The subscriber calls $event->getHash(), which only
  // arrived in 6.7.6.0, so 6.6.6.0 to 6.7.5.x pass the guard and fail with an
  // undefined method. Needs a major+ finding in the plugin sources that names
  // PLG-024 or PLG-001, or describes getHash() missing behind the class guard.
  // No skill names these symbols: the releases come from the source or api-facts.
  // Ignore: The same subscriber, but the getHash() call sits behind
  // method_exists(HttpCacheCookieEvent::class, 'getHash'), and the class guard
  // in services.php covers 6.6.0.0 to 6.6.5.x. Every release is safe. A minor+
  // finding that names PLG-024 or PLG-001, or calls getHash() missing, is a
  // false positive.
  'later-member-guard': {
    rule: 'PLG-024',
    also: ['PLG-001'],
    file: 'src/**',
    minSeverity: 'major',
    summary:
      /getHash(\(\))?.{0,160}(missing|undefined|(does not|doesn't|did not) exist|not (available|present)|only (exists )?(from|since|in|on)|(added|introduced|arrived) in|6\.7\.6)|(undefined method|missing|(does not|doesn't) exist).{0,80}getHash/iu,
    ignore: {
      rule: 'PLG-024',
      also: ['PLG-001'],
      summary:
        /getHash(\(\))?.{0,160}(missing|undefined|(does not|doesn't|did not) exist|not (available|present)|only (exists )?(from|since|in|on)|(added|introduced|arrived) in|6\.7\.6)|(undefined method|missing|(does not|doesn't) exist).{0,80}getHash/iu,
    },
  },
  // Catch: The probe decides with searchIds() which category a customer can open.
  // searchIds() never dispatches sales_channel.category.loaded, where Dynamic
  // Access hides restricted categories, so the check still probes one the
  // storefront rejects. Needs a major+ finding in src/ that names REV-035 or
  // describes the missed loaded-event restriction.
  // Ignore: The probe loads the candidates with search() and checks getActive() on the
  // loaded categories, the check the storefront applies. A minor+ finding that
  // names REV-035 or claims a restriction is missed is a false positive.
  'loaded-event-visibility': {
    rule: 'REV-035',
    file: 'src/**',
    minSeverity: 'major',
    summary:
      /(\.loaded|loaded(-| )event|dynamic access|restrict|getActive|setActive|searchIds|active (flag|state) (set|changed) (by|on) (load|subscriber))/iu,
  },
  // Catch: The migration rewrites the gift card mail template text for every shop,
  // including templates the merchant edited. Needs a major+ finding in
  // src/Migration/ that names PLG-028 or describes overwriting merchant edits.
  // Ignore: The same update guarded with `updated_at IS NULL`. A minor+ finding that
  // names PLG-028 or says merchant edits get overwritten is a false positive.
  'migration-customized-data': {
    rule: 'PLG-028',
    file: 'src/Migration/**',
    minSeverity: 'major',
    summary:
      /customi[sz]|merchant|shop owner|edited|modified by|updated_at|overwrit|clobber|user.?made|own (template|text|changes)/iu,
  },
  // Catch: The backfill is batched (PLG-019 is satisfied), but it recomputes a listing
  // hash from product fields in SQL. The finding must come from the derived-data
  // rule: a major+ finding in src/Migration/ that names PLG-020 or asks for an
  // indexer.
  // A finding about rows without a system-language translation or about variants
  // that inherit the name is allowed: it is why the hash belongs to an indexer.
  // Ignore: The same batched backfill shape, but it renames the plugin's own label
  // column: it copies label into badge_label, updateDestructive() drops label, and
  // nothing is computed from other tables. A minor+ finding that names PLG-020 or
  // asks for an indexer is a false positive. A finding that labels old code writes
  // between update() and the drop get lost is allowed: it is a real blue-green
  // gap, and closing it (triggers) only drew more noise.
  'migration-derived-data': {
    rule: 'PLG-020',
    file: 'src/Migration/**',
    minSeverity: 'major',
    summary: /indexer|registerIndexer|PostUpdateIndexer|derived (data|values?)|recomput/iu,
    allowed: [
      {
        rule: 'PLG-020',
        file: 'src/Migration/**',
        minSeverity: 'minor',
        summary: /translation|language|variant|inherit|parent/iu,
      },
    ],
    ignore: {
      rule: 'PLG-020',
      summary: /indexer|registerIndexer|PostUpdateIndexer|derived (data|values?)|recomput/iu,
      allowed: [
        {
          rule: 'PLG-017',
          also: ['PLG-018', 'PLG-019', 'PLG-020'],
          file: 'src/Migration/**',
          minSeverity: 'minor',
          summary:
            /old(-| )(code|version|app|instance|plugin)|rolling|stale|before the new code|deploy|blue.?green|between update|after (update\(\)|the (one-time )?(backfill|copy))|written (after|meanwhile|later)|meanwhile|concurrent/iu,
        },
      ],
    },
  },
  // Catch: updateDestructive() runs one full-table UPDATE join over swag_loyalty_account
  // before it drops the legacy column. The backfill is long-running work in the
  // destructive step; it belongs in update(), batched, so the destructive step
  // stays a drop. Needs a minor+ finding in src/Migration/ that names PLG-018 or
  // PLG-017 (a non-destructive backfill in the destructive step) or describes the
  // heavy work in updateDestructive(). Minor, not major: the severity table in
  // sw-extension-review rates costly or fragile work as minor. A PLG-019 finding
  // about the same unbatched UPDATE is allowed: it is the same problem. So is a
  // finding that the drop runs without checking every row got a tier_id: it
  // points at the same destructive step.
  // Ignore: The same tier move, but the tier_id backfill is batched in update() and
  // updateDestructive() only deletes one config key and drops the column. A
  // minor+ finding that names PLG-018 or calls the destructive step heavy is a
  // false positive. A finding that tiers old code writes between update() and the
  // drop get lost is allowed, as in the derived-data pair.
  'migration-destructive-backfill': {
    rule: 'PLG-018',
    also: ['PLG-017'],
    file: 'src/Migration/**',
    minSeverity: 'minor',
    summary:
      /updateDestructive[^.]*(heavy|\blong|slow|time ?out|backfill|whole table|entire table|every row|all (rows|accounts)|stay small)|(heavy|long-running|backfill|time ?out)[^.]*updateDestructive/iu,
    allowed: [
      {
        rule: 'PLG-019',
        file: 'src/Migration/**',
        minSeverity: 'minor',
        summary: /batch|chunk|single UPDATE|one UPDATE|whole table|entire table|every row|all rows/iu,
      },
      {
        rule: 'PLG-018',
        file: 'src/Migration/**',
        minSeverity: 'minor',
        summary:
          /drop[^.]*(unmatched|miss|without (check|verif)|coverage|lose|lost)|(unmatched|miss|lose|lost)[^.]*drop/iu,
      },
    ],
    ignore: {
      rule: 'PLG-018',
      summary:
        /updateDestructive[^.]*(heavy|\blong|slow|time ?out|backfill|whole table|entire table|every row|all (rows|accounts)|stay small)|(heavy|long-running|backfill|time ?out)[^.]*updateDestructive/iu,
      allowed: [
        {
          rule: 'PLG-017',
          also: ['PLG-018', 'PLG-019', 'PLG-020'],
          file: 'src/Migration/**',
          minSeverity: 'minor',
          summary:
            /old(-| )(code|version|app|instance|plugin)|rolling|stale|before the new code|deploy|blue.?green|between update|after (update\(\)|the (one-time )?(backfill|copy))|written (after|meanwhile|later)|meanwhile|concurrent/iu,
        },
      ],
    },
  },
  // Catch: The new migration's updateDestructive() is empty, and its test only runs it
  // and expects no error, so the test covers no behaviour. Needs a minor+
  // finding in src/Core/Migration/ that names CORE-040 or describes the test of
  // a no-op method.
  // Ignore: A destructive step that drops a column, with a test that checks the column
  // is gone. It looks like the catch case but is not a no-op: a minor+ finding
  // that names CORE-040 or calls the test empty is a false positive.
  'migration-empty-destructive': {
    rule: 'CORE-040',
    file: 'src/Core/Migration/**',
    minSeverity: 'minor',
    summary: /\b(empty|no-op|noop|does nothing|trivial|tautolog|meaningless)\b/iu,
  },
  // Catch: The migration branches on Feature::isActive(), so the flag state at
  // migration time decides the schema for good. Needs a major+ finding in
  // src/Migration/ that names PLG-029 or describes the flag-dependent schema.
  // Ignore: The migration adds the column unconditionally; only the tier resolver
  // reads the flag. A minor+ finding that names PLG-029 or ties the flag to the
  // migration or schema is a false positive.
  'migration-feature-flag': {
    rule: 'PLG-029',
    file: 'src/Migration/**',
    minSeverity: 'major',
    summary:
      /(migration|schema|column)[^.]{0,80}(feature.?flag|Feature::|\bflag\b)|(feature.?flag|Feature::|\bflag\b)[^.]{0,80}(migration|schema|column)/iu,
  },
  // Catch: update() shrinks external_ref from VARCHAR(255) NULL to VARCHAR(64) NOT
  // NULL without a default: existing rows fail or get cut. Needs a major+
  // finding in src/Migration/ that names PLG-030 or describes the narrowing.
  // Ignore: update() widens external_ref and adds a nullable column, both safe in a
  // non-destructive migration. A minor+ finding that names PLG-030 or calls it
  // narrowing, destructive or data loss is a false positive.
  'migration-narrowing-update': {
    rule: 'PLG-030',
    file: 'src/Migration/**',
    minSeverity: 'major',
    summary:
      /narrow|shrink|shorten|truncat|NOT NULL|without (a )?default|no default|updateDestructive|destructive|data loss|lose data|existing (rows|values|data)|longer than 64/iu,
  },
  // Catch: The backfill updates every swag_review row in one statement with a
  // correlated subquery over order_line_item. Needs a major+ finding in
  // src/Migration/ that names PLG-019 or asks for batches.
  // Ignore: The same backfill in batches of 1,000 ordered by id with a cursor. A
  // minor+ finding that names PLG-019 or asks for batching is a false positive.
  'migration-unbatched-backfill': {
    rule: 'PLG-019',
    file: 'src/Migration/**',
    minSeverity: 'major',
    summary:
      /batch|chunk|single (UPDATE|statement|query)|one (UPDATE|statement|query)|whole table|entire table|every row|all rows|large (table|shops?)|big (table|shops?)|\block|time ?out|cursor/iu,
  },
  // Catch: The points only show after a merchant turns on a new setting and runs a
  // backfill command by hand. Computing them from the order lines the finish
  // page already loads needs neither. A major+ finding in src/ that names
  // IMP-005 or calls the setting and backfill a step the shop has to take.
  // Ignore: The points are computed from the order lines the finish page already has:
  // no setting, no command, no extra query. A minor+ finding that names IMP-005
  // or calls the points an extra step is a false positive.
  'opt-in-backfill': {
    rule: 'IMP-005',
    file: 'src/**',
    minSeverity: 'major',
    summary:
      /(new|extra|additional|another) (config|setting|option|header|flag|command|step|ritual)|merchant[^.]{0,80}(must|has to|needs to|have to) (enable|turn on|run|set|configure)|backfill|(extra|manual|another) step|easier|(removes?|drops?|skips?) (a|the|this|one) step|(setting|config|flag)[^.]{0,60}(off by default|default (off|false))|compute[^.]{0,80}(at read|on read|on render|from the (loaded )?(order|lines?))/iu,
  },
  // Catch: composer.json only suggests shopware/storefront and services.php guards the
  // storefront subscriber with InstalledVersions. The diff registers a new
  // StorefrontController subclass and imports its routes outside that guard,
  // so a headless shop without the storefront fails to compile the container
  // and every request 500s. Needs a major+ finding in src/ that names PLG-032
  // or describes the missing guard.
  // Ignore: The same storefront page, registered and routed inside the existing
  // InstalledVersions guard for the suggested shopware/storefront package. A
  // minor+ finding that names PLG-032 or calls the storefront dependency
  // unguarded is a false positive.
  'optional-package-guard': {
    rule: 'PLG-032',
    file: 'src/**',
    minSeverity: 'major',
    summary:
      /suggest|headless|without (the )?(shopware.)?storefront|storefront (is )?(not installed|missing|absent)|guard|class_exists|InstalledVersions|optional (package|dependency)/iu,
  },
  // Catch: A new method in a core service silences a phpstan-shopware custom rule with
  // an inline suppression. The stated reason sounds plausible, so a reviewer
  // without the rule accepts it. Needs a minor+ finding in src/Core/ that names
  // CORE-062, or, without a catalog ID, names the phpstan-shopware rule it breaks.
  // A finding that only calls the suppression out is not enough: that is CORE-060's
  // ground, and a reviewer without the rule reports it too.
  // Ignore: The same method, with the Context passed in and no suppression. A minor+
  // finding that names CORE-062 or the phpstan-shopware rule is a false positive.
  'phpstan-suppression': {
    rule: 'CORE-062',
    file: 'src/Core/**',
    minSeverity: 'minor',
    summary: /phpstan-shopware|shopwarelabs/iu,
    ignore: {
      rule: 'CORE-062',
      summary: /phpstan-shopware|shopwarelabs|suppress|silenc|phpstan-ignore/iu,
    },
  },
  // Catch: The diff is one PR of about 550 changed lines that mixes a command, a CSV
  // export, an event with its subscriber and a plugin refactor, without a split.
  // A minor+ finding that names REV-005 or the size of the change passes.
  // Ignore: The change is one feature slice of about 220 changed lines, under the
  // size guide. A minor+ finding that names REV-005 or the size of the change
  // is a false positive.
  'pr-size': {
    rule: 'REV-005',
    file: '**',
    minSeverity: 'minor',
    summary: /(changed lines|lines changed|line count|PR size|too (large|big)|\b400\b|\bsplit\b)/iu,
    ignore: {
      rule: 'REV-005',
      summary: /(changed lines|lines changed|line count|PR size|too (large|big)|\b400\b)/iu,
    },
  },
  // Catch: When dispatching the export message fails, the subscriber runs the
  // 2 to 10 second ERP export inline during checkout. Needs a major+ finding
  // in src/ that names REV-033 or describes the synchronous fallback.
  // Ignore: The subscriber only dispatches the message (with an early return for free
  // orders); the handler does the export. A minor+ finding that names REV-033
  // or calls the export synchronous is a false positive.
  'queue-inline-fallback': {
    rule: 'REV-033',
    file: 'src/**',
    minSeverity: 'major',
    summary:
      /inline|synchronous|fallback|in the (checkout |storefront )?request|blocks? (the )?(checkout|request|customer)|request thread/iu,
  },
  'queue-payload': {
    rule: 'ARCH-006',
    file: 'src/**',
    minSeverity: 'major',
    summary: /serializ|round.trip|constructor default|lost[^.]{0,60}flag/iu,
  },
  // Catch: An Admin route checks a user-given export file name with
  // `/^[a-z0-9][a-z0-9_-]{0,63}$/i` and builds a path from it. `$` also matches
  // before a trailing newline, so "points\n" passes. Needs a minor+ finding in
  // src/ that names SEC-009 or describes the trailing newline or end anchor.
  // Minor, not major: by the severity table in sw-extension-review a newline
  // in a private file name, with no traversal, is fragile, not a hole.
  // Ignore: The same export file name check, but the pattern ends in `\z`, which
  // matches only at the very end of the string. Any finding above nit is a
  // false positive, most of all one that asks for the `D` modifier on top.
  'regex-end-anchor': {
    rule: 'SEC-009',
    file: 'src/**',
    minSeverity: 'minor',
    summary:
      /newline|line break|\\n|\\z|\bD\b.{0,20}(modifier|flag)|(modifier|flag).{0,20}\bD\b|end anchor|end-of-string|\$ (also )?match/iu,
  },
  // Catch: The RELEASE_INFO entry opens with a bold label. Needs a minor+ finding in
  // RELEASE_INFO-*.md that names CORE-049 or describes the bold label.
  // Ignore: The same RELEASE_INFO entry without the bold label. A minor+ finding that
  // names CORE-049 or calls the entry bold is a false positive.
  'release-info-bold-label': {
    rule: 'CORE-049',
    file: 'RELEASE_INFO-*.md',
    minSeverity: 'minor',
    summary: /bold|\*\*/iu,
  },
  // Catch: LoyaltyConfigReader memoizes per-sales-channel config in properties and
  // never clears them. Workers and other long-running processes keep the old
  // rates after the merchant changes the config. Needs a major+ finding in
  // src/ that names ARCH-001 or describes the missing reset.
  // Ignore: The same memoization, but the service implements ResetInterface and
  // reset() clears both arrays. A minor+ finding that names ARCH-001 or calls
  // the cache stale or unreset is a false positive.
  'reset-interface': {
    rule: 'ARCH-001',
    file: 'src/**',
    minSeverity: 'major',
    summary:
      /ResetInterface|kernel\.reset|reset\(\)|never (cleared|reset)|stale|long.running|workers?\b|across requests|between requests/iu,
  },
  'reset-runtime': {
    rule: 'ARCH-001',
    file: 'src/**',
    minSeverity: 'major',
    summary: /LONGRUNNING_ENVIRONMENT|(?:kernel|HTTP)[^.]{0,100}(?:reset|lifecycle)/iu,
  },
  // Catch: The released /store-api/swag-loyalty/rewards route switches from a public,
  // HTTP-cached route to `_loginRequired` and drops `_httpCache`. Guest clients
  // get 403 and every call misses the cache. Needs a major+ finding in src/
  // that names SEC-007 or describes the changed route defaults.
  // Ignore: The change adds a new login-only route and leaves the existing public
  // route as it was. A minor+ finding that names SEC-007 or calls the login
  // requirement or caching a breaking route change is a false positive.
  'route-defaults-changed': {
    rule: 'SEC-007',
    file: 'src/**',
    minSeverity: 'major',
    summary:
      /_loginRequired|_httpCache|login.?required|requires? (a )?login|logged.?in|anonymous|guests?\b|401|403|no longer (cached|public)|cach|route (scope|defaults)|breaking|backward.?compat|\bBC\b|existing (clients|callers)/iu,
  },
  // Catch: A new public Store-API route passes `limit` and `offset` from the query to
  // the DAL. `getInt` types them but sets no bound, so any anonymous caller can
  // ask for the whole ranking in one request. Needs a major+ finding in src/
  // that names SEC-005 or describes the missing upper bound.
  // Ignore: The same leaderboard route, but `limit` is clamped to 1..50 and `offset` to
  // 0 or more before they reach the DAL. A minor+ finding that names SEC-005 or
  // calls the input unbounded or unconstrained is a false positive.
  'route-input': {
    rule: 'SEC-005',
    file: 'src/**',
    minSeverity: 'major',
    summary:
      /unbound|no (upper |max(imum)? )?(bound|limit|cap)|unconstrained|not (constrained|capped|bounded|limited)|without (a )?(max|upper|cap)|whole table|dump/iu,
  },
  // Catch: ProductReviewCsvExporter::export() takes a Symfony Request and reads the
  // query string itself, so HTTP input reaches a domain service. Needs a major+
  // finding in src/Core/ that names CORE-053 or describes the Request dependency.
  // Ignore: The same exporter, but the controller translates the Request into plain
  // values and the service takes arrays and booleans. A minor+ finding that
  // names CORE-053 or calls the service tied to the Request is a false positive.
  'service-request': {
    rule: 'CORE-053',
    file: 'src/Core/**',
    minSeverity: 'major',
    summary:
      /\bRequest\b|HttpFoundation|[Hh]exagonal|[Ii]nfrastructure|framework object|plain (?:input|value|argument)/u,
  },
  // Catch: SwagLoyalty supports Shopware 6.7 and 6.8 and already registers its
  // services in services.php. The change registers the new expiry reminder
  // services in a new services.xml. Symfony 8 (6.8) drops the XML loader, so
  // the plugin fails to boot on 6.8. Needs a major+ finding in the plugin
  // config that names PLG-026 or describes the XML DI file.
  // Ignore: The change registers the same services in services.php and adds fields to
  // config.xml. config.xml is plugin configuration, not DI, and keeps working
  // on 6.8. A minor+ finding that names PLG-026 or calls an XML file a 6.8
  // boot problem is a false positive; a nit that says config.xml is fine is not.
  'services-xml-68': {
    rule: 'PLG-026',
    file: 'src/Resources/config/**',
    minSeverity: 'major',
    summary:
      /services\.xml|xml (service|di|container|config(uration)?) (loader|files?)|\b6\.8\b|symfony 8|services\.php/iu,
    ignore: {
      rule: 'PLG-026',
      summary:
        /services\.xml|xml (service|di|container|config(uration)?)( file)? (loader|loading|files?)|\b6\.8\b|symfony 8/iu,
    },
  },
  // Catch: The plugin renames snippet key swag-loyalty.badge.label to
  // swag-loyalty.badge.title. Themes and merchant snippet sets that override
  // or use the old key fall back to the raw key. Needs a major+ finding in
  // src/Resources/ that names SF-012 or describes the rename without
  // deprecation.
  // Ignore: The plugin adds a new snippet key and keeps every existing one. A minor+
  // finding that names SF-012 or calls it a breaking change is a false
  // positive.
  'snippet-key-renamed': {
    rule: 'SF-012',
    file: 'src/Resources/**',
    minSeverity: 'major',
    summary:
      /renam|remov|no longer exist|deprecat|breaks? (themes?|overrides?|translations?|templates?)|themes?\b[^.]{0,80}(break|overrid|translat)|backward.?compat|\bBC\b|breaking|old (snippet )?key|missing translation|untranslated/iu,
  },
  // Catch: The released /store-api/loyalty/balance route changes `points` from a
  // non-null integer to a nullable number. Needs a major+ finding in src/ that
  // names PLG-027 or describes the breaking type or nullability change.
  // Ignore: The change adds an optional `pointsExpireAt` field and leaves the existing
  // fields alone. A minor+ finding that names PLG-027 or calls it a breaking
  // contract change is a false positive.
  'store-api-contract': {
    rule: 'PLG-027',
    file: 'src/**',
    minSeverity: 'major',
    summary:
      /nullab|type change|changes? (the |its )?(response |field )?type|from int\w* to|breaking|backward.?compat|\bBC\b|existing clients/iu,
  },
  // Catch: The released /store-api/swag-wishlist/add route now requires `list` and a
  // new `note` parameter and no longer accepts `later`. Clients that worked
  // before get 400 errors. Needs a major+ finding in src/ that names PLG-031
  // or describes the new required input or stricter validation.
  // Ignore: The change adds an optional `note` parameter and keeps the existing
  // validation. A minor+ finding that names PLG-031 or calls the route
  // stricter or breaking is a false positive.
  'store-api-stricter-request': {
    rule: 'PLG-031',
    file: 'src/**',
    minSeverity: 'major',
    summary:
      /required|stricter|reject|no longer accept|now fails?|400|validation|breaking|backward.?compat|\bBC\b|existing (clients|callers|integrations|requests)/iu,
  },
  // Catch: The change adds a "recommended for your tier" pagelet on the account page
  // that searches product.repository with Context::createDefaultContext(). That
  // skips the sales channel availability filter (inactive, not visible) and uses
  // the system language, default currency and no rule prices, so there is no
  // calculatedPrice. Needs a major+ finding in the plugin sources that names
  // PLG-016 or describes the missing sales channel context.
  // Ignore: The change adds the same pagelet but searches sales_channel.product.repository
  // with the SalesChannelContext and renders calculatedPrice, like the existing
  // highlights loader. A minor+ finding that names PLG-016 or calls the context
  // or the listed products wrong is a false positive.
  'storefront-default-context': {
    rule: 'PLG-016',
    file: 'src/**',
    minSeverity: 'major',
    summary:
      /createDefaultContext|default context|sales.channel (context|repositor)|visib|inactive|language|currency|(customer group|rule) prices?|calculatedPrice/iu,
  },
  // Catch: SwagNavigationTeaser 1.4.0 allows shopware/core ~6.6.0 || ~6.7.0 and
  // extends @Storefront/storefront/layout/navigation/flyout.html.twig to add a
  // teaser image. Core removed that template in 6.7.0.0 (the navbar replaced
  // it), so on every 6.7 release the teaser never renders. Needs a major+
  // finding in the views that names PLG-001 or describes the template missing
  // in 6.7. No skill names the template: the release comes from the source or
  // api-facts.
  // Ignore: The same change, but composer.json requires shopware/core ~6.6.0, and
  // every 6.6 release ships the template. A minor+ finding that names PLG-001
  // or calls the template missing in 6.7 is a false positive.
  // A note that core deprecates it for removal in 6.7 is true and fine: the
  // facts list the deprecation, and new code should plan the migration.
  'storefront-template-range': {
    rule: 'PLG-001',
    file: 'src/Resources/views/**',
    minSeverity: 'major',
    summary:
      /(remov|no longer (exist|ship|render|load|regist)|(does not|doesn't|did not) exist|missing|gone|dropped|not registered)(?:[^.]|\.\S){0,80}6\.7|6\.7(?:[^.]|\.\S){0,80}(remov|no longer|(does not|doesn't) exist|missing|gone|drop|not registered|silently)/iu,
    ignore: {
      rule: 'PLG-001',
      summary:
        /^(?!.*deprecat).*?(?:(remov|no longer (exist|ship|render|load|regist)|(does not|doesn't|did not) exist|missing|gone|dropped|not registered)(?:[^.]|\.\S){0,80}6\.7|6\.7(?:[^.]|\.\S){0,80}(remov|no longer|(does not|doesn't) exist|missing|gone|drop|not registered|silently))/iu,
      allowed: [
        {
          rule: 'PLG-001',
          file: 'src/**',
          minSeverity: 'minor',
          summary: /(?=.*layout_navigation_flyout_bar_category)(?=.*deprecat)(?=.*6\.7)/iu,
        },
      ],
    },
  },
  // Catch: SwagPaymentSync 2.4.1 keeps shopware/core ~6.6.0 || ~6.7.0 and swaps the
  // deprecated OrderTransactionStateHandler::payPartially() for paidPartially().
  // paidPartially() only exists from 6.7.0.0, so every 6.6 shop fails with an
  // undefined method on a partial capture. Needs a major+ finding in the plugin
  // sources that names PLG-001 or describes the missing method on 6.6.
  // Ignore: The same switch to paidPartially(), but release 3.0.0 narrows
  // shopware/core to ~6.7.0 and says so in the changelog. Every allowed release
  // has the method. A minor+ finding that names PLG-001 or calls the method
  // missing is a false positive.
  'supported-range': {
    rule: 'PLG-001',
    file: 'src/**',
    minSeverity: 'major',
    summary:
      /undefined method|(does not|doesn't|did not) exist|not (available|present) (on|in|before)|missing (on|in|from)|(added|introduced|arrived) (only )?in 6\.7|only (exists )?(from|since|in|on) 6\.7|breaks? .{0,40}6\.6/iu,
  },
  // Catch: SwagLoyalty supports Shopware 6.6 and 6.7. The change adds an account page
  // with a redeem form that calls sw_csrf(), a Twig function removed in 6.5.
  // The template no longer compiles ("Unknown function"), so every page that
  // includes it returns a 500. Needs a major+ finding in the storefront views
  // that names SF-009 or describes the removed CSRF function.
  // Ignore: The change adds the same redeem form without any CSRF call, which is
  // correct on 6.5+: storefront forms need no token. A minor+ finding that
  // names SF-009 or mentions CSRF at all (the form "lacks CSRF protection") is
  // a false positive.
  'sw-csrf': {
    rule: 'SF-009',
    file: 'src/Resources/views/**',
    minSeverity: 'major',
    summary: /csrf|unknown .{0,10}function|removed in 6\.5|\b6\.5\b/iu,
  },
  // Catch: The assertions on the captured event sit inside if ($changed !== null), so
  // the test passes when the event is never dispatched. Capturing in the hook
  // is fine (TEST-016). Needs a major+ finding in tests/ that names TEST-035
  // or describes the test that cannot fail.
  // Ignore: The test asserts the captured event with assertInstanceOf before reading
  // its fields. A minor+ finding that names TEST-035 or says the test passes
  // without the event is a false positive.
  'test-cannot-fail': {
    rule: 'TEST-035',
    file: 'tests/**',
    minSeverity: 'major',
    summary:
      /cannot fail|can.t fail|never fails?|passes (even )?(when|if)|silently pass|vacuous|assertNotNull|assertInstanceOf|if \(\$\w+ !== null\)|(hook|event) (was )?(never )?(fired|dispatched)/iu,
  },
  // Catch: The PR adds LoyaltyCalculator and a test for it under tests/integration/.
  // The test uses plain PHPUnit assertions and never boots the kernel, so it
  // belongs in tests/unit/. Needs a minor+ finding that cites TEST-034 on a file
  // in tests/ explaining why the test belongs in the unit suite.
  // Ignore: The PR adds LoyaltyPointWriter and an integration test that writes through
  // the account repository and reads the row back. That test needs the
  // container, so it stays under tests/integration/. A minor+ finding that names
  // TEST-034 or says the test belongs in tests/unit/ is a false positive.
  'test-unit-placement': {
    rule: 'TEST-034',
    file: 'tests/**',
    minSeverity: 'minor',
    summary: /unit|integration|kernel|container|DAL|HTTP/iu,
    ignore: {
      rule: 'TEST-034',
      summary:
        /tests\/unit|unit (suite|tests?|folder)|(belongs?|move[sd]?|should (be|live|go)).{0,40}unit|needs? no (kernel|container)|no kernel/iu,
    },
  },
  // Catch: The plugin template renames block swag_loyalty_badge_label to
  // swag_loyalty_badge_text and drops the old name, so theme overrides of the
  // old block silently stop rendering. Needs a major+ finding in the views
  // that names SF-001 or describes the rename without deprecation.
  // Ignore: The change adds an inner block and keeps every existing block name. A
  // minor+ finding that names SF-001 or calls it a breaking change for themes
  // is a false positive.
  'twig-block-removed': {
    rule: 'SF-001',
    file: 'src/Resources/views/**',
    minSeverity: 'major',
    summary:
      /renam|remov|no longer exist|deprecat|breaks? (themes?|overrides?|extensions?)|themes?\b[^.]{0,60}(break|overrid|extend)|backward.?compat|\bBC\b|breaking/iu,
  },
  // Catch: SwagMediaCdn supports ~6.6.0 || ~6.7.0 and registers a subscriber for
  // UpdateMediaPathEvent behind class_exists(). The event exists in every
  // release since 6.5.7.0, so the guard is always true. Needs a minor+ finding
  // in the plugin sources that names REV-015 or describes the dead guard. No
  // skill names UpdateMediaPathEvent, and no comment hints at a version.
  // Ignore: SwagMediaCdn registers a RemoteMediaImporter behind
  // class_exists(MediaUploadService::class). MediaUploadService arrived in
  // 6.7.1.0, so 6.6.0.0 to 6.7.0.x skip the importer and the guard is needed. A
  // minor+ finding that names REV-015 or calls the guard dead is a false
  // positive.
  'unneeded-guard': {
    rule: 'REV-015',
    file: 'src/**',
    minSeverity: 'minor',
    summary:
      /dead|always (true|exists|available|passes|present)|never (false|fails)|unnecessary|redundant|not needed|no(t a)? need|since 6\.5|every (supported )?(release|version)|(in|on) (both|all) (supported )?(6\.6|minors|releases|versions)|(already|also) (exists|available|present) (in|on) 6\.6/iu,
  },
};
