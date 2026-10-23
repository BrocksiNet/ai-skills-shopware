import assert from 'node:assert/strict';
import { test } from 'node:test';
import { diffSnapshots } from '../src/api-diff.ts';
import { ADMIN_SRC, componentItems, globalItems, isAdminSource, registrations } from '../src/admin.ts';
import type { Item } from '../src/model.ts';
import {
  pluginItems,
  pluginRegistrations,
  STOREFRONT_SRC,
  STOREFRONT_VIEWS,
  templateItems,
} from '../src/storefront.ts';
import { scanTwig } from '../src/twig.ts';
import { twigItems } from '../src/twig-php.ts';
import { snapshot, V66, V67 } from './frontend-fixture.ts';

function ids(items: Item[]): string[] {
  return items.map((item) => item.id);
}

function byId(items: Item[], id: string): Item | undefined {
  return items.find((item) => item.id === id);
}

test('scanTwig: blocks with parents and lines, deprecations, slots and positions', () => {
  const twig = [
    "{% sw_extends '@Storefront/storefront/base.html.twig' %}",
    '{% block outer %}',
    '    {# @deprecated tag:v6.8.0 - use outer_new #}',
    '    {% block inner %}<slot name="title"></slot><slot></slot>{% endblock %}',
    "    {% block inline 'x' %}",
    '    <sw-extension-component-section position-identifier="sw-product-detail-base" />',
    '    <div :position-identifier="dynamic"></div>',
    '{% endblock %}',
  ].join('\n');
  const file = scanTwig(twig);
  assert.equal(file.extends, '@Storefront/storefront/base.html.twig');
  assert.equal(file.deprecated, undefined);
  assert.deepEqual(file.blocks, [
    { name: 'outer', line: 2 },
    { name: 'inner', parent: 'outer', deprecated: 'v6.8.0', line: 4 },
    { name: 'inline', parent: 'outer', line: 5 },
  ]);
  assert.deepEqual(file.slots, ['title', 'default']);
  assert.deepEqual(file.positions, ['sw-product-detail-base']);
});

test('scanTwig: a deprecation before any content deprecates the template', () => {
  const file = scanTwig("{% sw_extends 'a' %}\n{# @deprecated tag:v6.8.0 #}\n{% block a %}{% endblock %}");
  assert.equal(file.deprecated, 'v6.8.0');
  assert.equal(scanTwig('<div></div>{# @deprecated #}{% block a %}{% endblock %}').deprecated, undefined);
});

const ADMIN_FILES = new Map<string, string>([
  [
    `${ADMIN_SRC}/app/main.ts`,
    [
      "Shopware.Component.register('sw-card', () => import('src/app/component/sw-card'));",
      "Shopware.Component.extend('sw-email-field', 'sw-text-field', import('./sw-email-field'));",
    ].join('\n'),
  ],
  [
    `${ADMIN_SRC}/app/component/sw-card/index.ts`,
    [
      "import template from './sw-card.html.twig';",
      '/** @deprecated tag:v6.8.0 - use mt-card */',
      'export default Shopware.Component.wrapComponentConfig({',
      '    template,',
      '    props: { title: { type: String, required: true }, hero: { type: Boolean, required: false } },',
      "    emits: ['close'],",
      '    methods: {',
      '        open() {},',
      '        /** @private */',
      '        helper() {},',
      '    },',
      '});',
    ].join('\n'),
  ],
  [
    `${ADMIN_SRC}/app/component/sw-card/sw-card.html.twig`,
    '{% block sw_card %}{% block sw_card_title %}{% endblock %}{% endblock %}',
  ],
  [`${ADMIN_SRC}/app/sw-email-field.js`, "export default { props: ['value'] };"],
  [
    `${ADMIN_SRC}/app/component/sw-old.js`,
    "/**\n * @private\n */\nShopware.Component.register('sw-old', { template: '<div/>', methods: { run() {} } });",
  ],
]);

function adminItems(): Item[] {
  const files = new Set(ADMIN_FILES.keys());
  return [...ADMIN_FILES].flatMap(([path, code]) =>
    path.endsWith('.twig')
      ? []
      : registrations(code, path, files).flatMap((registration) =>
          componentItems(registration, (file) => ADMIN_FILES.get(file)),
        ),
  );
}

test('admin: components, members and blocks, from lazy, direct and inline registrations', () => {
  const items = adminItems();
  assert.deepEqual(byId(items, 'admin:sw-card')?.flags, { deprecated: 'v6.8.0' });
  assert.equal(byId(items, 'admin:sw-card.prop.title')?.signature, 'required');
  assert.equal(byId(items, 'admin:sw-card.prop.hero')?.signature, 'optional');
  assert.ok(byId(items, 'admin:sw-card.emit.close'));
  assert.deepEqual(byId(items, 'admin:sw-card.js-method.helper')?.flags, { internal: true });
  assert.equal(byId(items, 'admin:sw-card#sw_card_title')?.signature, 'sw_card');
  assert.equal(byId(items, 'admin:sw-email-field')?.signature, 'extends sw-text-field');
  assert.ok(byId(items, 'admin:sw-email-field.prop.value'));
  // An inline registration takes its flags from the comment above the call.
  assert.deepEqual(byId(items, 'admin:sw-old')?.flags, { internal: true });
  assert.ok(byId(items, 'admin:sw-old.js-method.run'));
});

test('admin: tests, mocks and type declarations are not sources', () => {
  assert.ok(isAdminSource(`${ADMIN_SRC}/app/a/index.ts`));
  assert.ok(!isAdminSource(`${ADMIN_SRC}/app/a/a.spec.vue2.js`));
  assert.ok(!isAdminSource(`${ADMIN_SRC}/global.types.d.ts`));
  assert.ok(!isAdminSource(`${ADMIN_SRC}/__mocks__/a.js`));
});

test('admin: the Shopware global and its members', () => {
  const code = [
    'class ShopwareClass {',
    '    public Component = { register: 1, /** @deprecated tag:v6.8.0 */ build: 2 };',
    '    private _secret = 1;',
    '    static version = 1;',
    '    constructor() {}',
    '}',
    'export default ShopwareClass;',
  ].join('\n');
  const items = globalItems(code, `${ADMIN_SRC}/core/shopware.ts`);
  assert.deepEqual(ids(items), [
    'global:Shopware.Component',
    'global:Shopware.Component.register',
    'global:Shopware.Component.build',
  ]);
  assert.deepEqual(byId(items, 'global:Shopware.Component.build')?.flags, { deprecated: 'v6.8.0' });
});

test('storefront: a template, its blocks and the template it extends', () => {
  const file = `${STOREFRONT_VIEWS}/page/checkout/index.html.twig`;
  const items = templateItems(
    "{% sw_extends '@Storefront/storefront/base.html.twig' %}\n{% block a %}{# @deprecated tag:v6.8.0 #}{% block b %}{% endblock %}{% endblock %}",
    file,
  );
  const id = 'storefront:@Storefront/storefront/page/checkout/index.html.twig';
  assert.deepEqual(ids(items), [id, `${id}#a`, `${id}#b`]);
  assert.equal(items[0]?.signature, '@Storefront/storefront/base.html.twig');
  assert.deepEqual(byId(items, `${id}#b`)?.flags, { deprecated: 'v6.8.0' });
});

test('storefront: plugins from main.js, with options and public methods', () => {
  const plugin = `${STOREFRONT_SRC}/plugin/scroll-up/scroll-up.plugin.js`;
  const main = [
    "import Old from 'src/plugin/scroll-up/scroll-up.plugin';",
    "PluginManager.register('ScrollUp', () => import('src/plugin/scroll-up/scroll-up.plugin'), '[data-scroll-up]');",
    "if (x) { PluginManager.register('Old', Old); }",
  ].join('\n');
  const code = [
    '/** @deprecated tag:v6.8.0 */',
    'export default class ScrollUpPlugin extends Plugin {',
    '    static options = { visiblePos: 250 };',
    '    init() {}',
    '    _private() {}',
    '    /** @private */',
    '    hidden() {}',
    '}',
  ].join('\n');
  const registered = pluginRegistrations(main, new Set([plugin]));
  assert.deepEqual(registered, [
    { name: 'ScrollUp', selector: '[data-scroll-up]', source: plugin },
    { name: 'Old', source: plugin },
  ]);
  const first = registered[0];
  assert.ok(first);
  const items = pluginItems(first, () => code);
  assert.deepEqual(ids(items), [
    'js-plugin:ScrollUp',
    'js-plugin:ScrollUp.option.visiblePos',
    'js-plugin:ScrollUp.js-method.init',
  ]);
  const head = byId(items, 'js-plugin:ScrollUp');
  assert.ok(head);
  assert.equal(head.signature, '[data-scroll-up]');
  assert.deepEqual(head.flags, { deprecated: 'v6.8.0' });
});

test('twig: functions, filters and tags core declares in PHP', () => {
  const code = [
    '<?php',
    'class CsrfExtension extends AbstractExtension {',
    '    public function getFunctions(): array {',
    '        return [',
    '            /** @deprecated tag:v6.5.0 - CSRF is gone */',
    "            new TwigFunction('sw_csrf', [$this, 'csrf']),",
    "            new TwigFunction('sw_icon', $this->icon(...)),",
    '        ];',
    '    }',
    "    public function getFilters(): array { return [new TwigFilter('sw_sanitize', $this->s(...))]; }",
    '}',
  ].join('\n');
  const items = twigItems(code, 'src/CsrfExtension.php');
  assert.deepEqual(ids(items), ['twig:function:sw_csrf', 'twig:function:sw_icon', 'twig:filter:sw_sanitize']);
  assert.deepEqual(items[0]?.flags, { deprecated: 'v6.5.0' });
  assert.deepEqual(items[1]?.flags, {});
  const parser =
    "<?php\nclass ExtendsTokenParser {\n    public function getTag(): string\n    {\n        return 'sw_extends';\n    }\n}";
  assert.deepEqual(ids(twigItems(parser, 'src/ExtendsTokenParser.php')), ['twig:tag:sw_extends']);
});

test('api-diff: admin, storefront, Twig and build changes', () => {
  const diff = diffSnapshots(snapshot('v6.6.0.0', V66), snapshot('v6.7.0.0', V67), [
    'admin',
    'storefront',
    'twig',
    'build',
  ]);
  const text = diff.changes.map(
    (change) => `${change.kind}${change.announced === true ? '*' : ''} ${change.id} ${change.detail}`,
  );
  assert.deepEqual(text.toSorted(), [
    'changed admin:sw-card.prop.title now required',
    'changed js-plugin:ScrollUp selector [data-scroll-up] → [data-scroll-top]',
    'deprecated admin:sw-card deprecated for v6.8.0',
    'removed build:admin.webpack removed',
    'removed* twig:function:sw_csrf removed',
  ]);
});
