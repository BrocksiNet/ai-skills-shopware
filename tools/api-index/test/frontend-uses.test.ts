import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { Lookup } from '../src/facts.ts';
import { frontendUses, isFrontendFile } from '../src/frontend-uses.ts';
import { factsOfDir } from '../src/report.ts';
import { mergeSnapshots } from '../src/timeline.ts';
import { CHECKOUT, snapshot, V66, V67 } from './frontend-fixture.ts';

const ADMIN = 'src/Resources/app/administration/src';
const VIEWS = 'src/Resources/views/storefront';

const EXTENSION: Record<string, string> = {
  [`${ADMIN}/main.js`]: ["import './override';", "Shopware.Component.extend('acme-email', 'sw-text-field', {});"].join(
    '\n',
  ),
  [`${ADMIN}/override/index.js`]: [
    "import template from './sw-card.html.twig';",
    "Shopware.Component.override('sw-card', {",
    '    template,',
    '    methods: { open() { this.$super("open"); } },',
    '});',
  ].join('\n'),
  [`${ADMIN}/override/sw-card.html.twig`]: '{% block sw_card_title %}<sw-button />{% endblock %}',
  'src/Resources/app/administration/build/webpack.config.js': 'module.exports = () => ({});',
  [`${VIEWS}/page/checkout/index.html.twig`]: [
    "{% sw_extends '@Storefront/storefront/page/checkout/index.html.twig' %}",
    '{% block base_content %}',
    "    {{ sw_csrf('frontend.checkout') }}{{ 'a'|trans|sw_sanitize }}",
    '{% endblock %}',
  ].join('\n'),
  'src/Resources/app/storefront/src/main.js': [
    "import Mine from './mine.plugin';",
    "window.PluginManager.override('ScrollUp', Mine, '[data-scroll-up]');",
  ].join('\n'),
};

function uses(): string[] {
  const files = new Map(Object.entries(EXTENSION));
  return frontendUses(files).uses.map(
    (use) => `${use.how} ${use.target} ${use.file.split('/').at(-1) ?? ''}:${use.line}`,
  );
}

test('frontend uses: overrides, blocks, tags, Twig calls, plugins and the webpack config', () => {
  const found = uses();
  for (const expected of [
    'override admin:sw-card index.js:2',
    'override admin:sw-card.js-method.open index.js:4',
    'block admin:sw-card#sw_card_title sw-card.html.twig:1',
    'tag admin:sw-button sw-card.html.twig:1',
    'extends admin:sw-text-field main.js:2',
    'build build:admin.webpack webpack.config.js:1',
    'extends storefront:@Storefront/storefront/page/checkout/index.html.twig index.html.twig:1',
    'block storefront:@Storefront/storefront/page/checkout/index.html.twig#base_content index.html.twig:2',
    'twig twig:function:sw_csrf index.html.twig:3',
    'twig twig:filter:sw_sanitize index.html.twig:3',
    'override js-plugin:ScrollUp main.js:2',
  ]) {
    assert.ok(found.includes(expected), `${expected} not in\n${found.join('\n')}`);
  }
  // A string is not a call.
  assert.ok(!found.some((use) => use.includes('twig:function:frontend')));
});

test('frontend uses: only admin, storefront, template and build files are read', () => {
  assert.ok(isFrontendFile(`${ADMIN}/main.js`));
  assert.ok(isFrontendFile(`${VIEWS}/base.html.twig`));
  assert.ok(!isFrontendFile(`${ADMIN}/main.spec.js`));
  assert.ok(!isFrontendFile('src/Resources/public/administration/js/acme.js'));
});

test('api-facts: a block resolves through the template chain, a member through its component', () => {
  const lookup = new Lookup(mergeSnapshots([snapshot('v6.6.0.0', V66), snapshot('v6.7.0.0', V67)]));
  const dir = mkdtempSync(join(tmpdir(), 'api-facts-frontend-'));
  try {
    for (const [path, code] of Object.entries(EXTENSION)) {
      mkdirSync(join(dir, dirname(path)), { recursive: true });
      writeFileSync(join(dir, path), code);
    }
    const report = factsOfDir(lookup, dir, '~6.6.0 || ~6.7.0');
    const facts = report.facts.map(
      (fact) => `${fact.kind} ${fact.target}${fact.via === undefined ? '' : ` via ${fact.via}`}`,
    );
    assert.deepEqual(facts.toSorted(), [
      'deprecated admin:sw-card',
      'deprecated admin:sw-card#sw_card_title via admin:sw-card',
      'deprecated admin:sw-card.js-method.open via admin:sw-card',
      'deprecated twig:function:sw_csrf',
      'missing build:admin.webpack',
      'missing twig:function:sw_csrf',
    ]);
    // The checkout block is found in base.html.twig; sw-button and trans are not Shopware's.
    assert.ok(report.symbols.includes(`${CHECKOUT}#base_content`));
    assert.ok(!report.symbols.some((symbol) => symbol.includes('sw-button') || symbol.includes('trans')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
