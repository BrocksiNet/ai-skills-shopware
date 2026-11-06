import assert from 'node:assert/strict';
import { test } from 'node:test';
import { diffSummary, withLines } from '../src/api-diff.ts';
import { lineOf } from '../src/source-line.ts';

const PHP = `<?php
namespace Shopware\\Core\\Foo;

final class Bar
{
    public const NAME = 'bar';

    private string $label;

    public function run(): void
    {
        $this->other();
    }

    #[Route(path: '/store-api/bar', name: 'store-api.bar', methods: ['GET'])]
    public function load(): void {}
}
`;

test('lineOf: PHP class, method, constant, property and route', () => {
  assert.equal(lineOf('php:Shopware\\Core\\Foo\\Bar', PHP), 4);
  assert.equal(lineOf('php:Shopware\\Core\\Foo\\Bar::run()', PHP), 10);
  assert.equal(lineOf('php:Shopware\\Core\\Foo\\Bar::NAME', PHP), 6);
  assert.equal(lineOf('php:Shopware\\Core\\Foo\\Bar::$label', PHP), 8);
  assert.equal(lineOf('route:store-api.bar', PHP), 15);
  assert.equal(lineOf('php:Shopware\\Core\\Foo\\Bar::gone()', PHP), undefined);
});

test('lineOf: a field is its property name, quoted', () => {
  const definition = `fields
    (new StringField('name', 'name'))
    (new TranslatedField('helpTexts'))->addFlags(new ApiAware()),
`;
  assert.equal(lineOf('field:theme.helpTexts', definition), 3);
});

test('lineOf: Twig blocks, with or without whitespace control', () => {
  const twig = `{% block page %}
  {%- block page_content -%}
  {% endblock %}
{% endblock %}
`;
  assert.equal(lineOf('storefront:@Storefront/storefront/page/x.html.twig#page_content', twig), 2);
  assert.equal(lineOf('admin:sw-x#page', twig), 1);
  // A template as a whole starts on line 1.
  assert.equal(lineOf('storefront:@Storefront/storefront/page/x.html.twig', twig), 1);
});

test('lineOf: a JS method is its definition, not its first call', () => {
  const js = `export default class Viewer extends Plugin {
    init() {
        this.startView();
    }

    async startView() {
    }
}
`;
  assert.equal(lineOf('js-plugin:Viewer.js-method.startView', js), 6);
  const component = `export default {
    props: {
        showSettings: {
            type: Boolean,
        },
    },
};
`;
  assert.equal(lineOf('admin:sw-x.prop.showSettings', component), 3);
});

test('withLines: a removal reads the base, everything else the head', () => {
  const diff = {
    base: 'v1',
    head: 'v2',
    skipped: 0,
    changes: [
      { surface: 'route' as const, kind: 'removed' as const, id: 'route:a', detail: 'removed', file: 'A.php' },
      { surface: 'route' as const, kind: 'deprecated' as const, id: 'route:b', detail: 'deprecated', file: 'B.php' },
    ],
  };
  const files: Record<string, Record<string, string>> = {
    v1: { 'A.php': "x\nname: 'a'\n" },
    v2: { 'B.php': "\n\nname: 'b'\n" },
  };
  const read = (ref: string, paths: string[]): Map<string, string> =>
    new Map(paths.flatMap((path) => (files[ref]?.[path] === undefined ? [] : [[path, files[ref][path]]])));
  const lines = withLines(diff, read, lineOf).changes.map((change) => change.line);
  assert.deepEqual(lines, [2, 3]);
  assert.equal(
    diffSummary(diff),
    'Summary: 1 breaking change without a deprecation in v1, 0 removals or changes after a deprecation, 1 new deprecation.',
  );
});
