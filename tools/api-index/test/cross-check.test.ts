// The sw-impact cross-check (plan WP D). The findings are the ones sw-impact
// left on core PR 17800, its seeded demonstration of admin breaks.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Change } from '../src/api-diff.ts';
import {
  type CrossCase,
  crossCheck,
  crossCheckReport,
  ourIdOf,
  recallByMember,
  symbolOf,
  type TheirFinding,
} from '../src/cross-check.ts';

const finding = (rule: string, symbol: string): TheirFinding => ({ rule, symbol, path: 'index.ts', line: 1 });

const CASE: CrossCase = {
  label: 'https://github.com/shopware/shopware/pull/17800',
  base: '4b703ef1dfe56a85b54fa751e3e1fc6089ee9d2b',
  head: 'ee2ec6e67b088a6454d9bc85b12fc73df3222b9b',
  theirs: [
    finding('vue:prop:became:required', 'vue.sw-cms-sidebar-nav-element.prop.duplicable'),
    finding('api:removed', 'vue.sw-vector-field.emit.input-change'),
    finding('vue:prop:type:changed', 'vue.sw-cms-sidebar-nav-element.prop.removable'),
    finding('ts:method:required:param:added', 'vue.sw-order-address-modal.method.getCustomFieldSetData'),
    finding('api:removed', 'vue.sw-order-address-modal.computed.customFieldSetRepository'),
    finding('api:removed', 'vue.sw-order-address-modal.watch.customerId'),
  ],
};

const change = (id: string, kind: Change['kind'], detail: string): Change => ({
  surface: 'admin',
  kind,
  id,
  detail,
  file: 'index.ts',
});

const OURS: Change[] = [
  change('admin:sw-cms-sidebar-nav-element.prop.duplicable', 'changed', 'now required'),
  change('admin:sw-vector-field.emit.input-change', 'removed', 'removed'),
  change('admin:sw-vector-field.js-method.reset', 'removed', 'removed'),
  change('admin:sw-vector-field#sw_vector_field', 'body-changed', 'body changed'),
];

test('their element names map to our ids through the table only', () => {
  assert.equal(ourIdOf('vue.sw-vector-field.method.onChange'), 'admin:sw-vector-field.js-method.onChange');
  assert.equal(ourIdOf('vue.sw-vector-field.prop.value'), 'admin:sw-vector-field.prop.value');
  assert.equal(ourIdOf('vue.sw-vector-field.computed.classes'), 'admin:sw-vector-field.computed.classes');
  assert.equal(ourIdOf('vue.sw-vector-field.watch.value'), null);
  assert.equal(ourIdOf('vue.sw-vector-field.inject.value'), undefined);
  assert.equal(ourIdOf('php.Shopware\\Core\\Foo'), undefined);
});

test('the element comes from quotes or backticks; other annotations are not findings', () => {
  assert.equal(
    symbolOf("Removed public API surface 'vue.sw-vector-field.emit.input-change'. Old signature was: 'input-change'"),
    'vue.sw-vector-field.emit.input-change',
  );
  assert.equal(
    symbolOf('Potential breaking change on public API surface `vue.sw-condition-date-range.method.formatDate`: x'),
    'vue.sw-condition-date-range.method.formatDate',
  );
  assert.equal(symbolOf('Process completed with exit code 1.'), undefined);
});

test('findings split into both, only theirs with a reason, and only our breaks', () => {
  const result = crossCheck(CASE, OURS);
  assert.deepEqual(
    result.both.map((entry) => entry.id),
    ['admin:sw-cms-sidebar-nav-element.prop.duplicable', 'admin:sw-vector-field.emit.input-change'],
  );
  assert.deepEqual(
    result.onlyTheirs.map((miss) => `${miss.reason}: ${miss.needs}`),
    [
      'no-detail: prop types',
      'no-detail: method parameters',
      'miss: api:removed',
      'no-surface: watch members',
    ],
  );
  // A body change is no break, so it is not "only ours".
  assert.deepEqual(
    result.onlyOurs.map((entry) => entry.id),
    ['admin:sw-vector-field.js-method.reset'],
  );
});

test('a removal on a surface we record but did not report is a plain miss', () => {
  const result = crossCheck({ ...CASE, theirs: [finding('api:removed', 'vue.sw-foo.method.bar')] }, []);
  assert.deepEqual(
    result.onlyTheirs.map((miss) => miss.reason),
    ['miss'],
  );
});

test('recall counts their findings per member kind', () => {
  const recall = recallByMember([crossCheck(CASE, OURS)]);
  assert.deepEqual(Object.fromEntries(recall), {
    computed: { found: 0, total: 1 },
    emit: { found: 1, total: 1 },
    method: { found: 0, total: 1 },
    prop: { found: 1, total: 2 },
    watch: { found: 0, total: 1 },
  });
});

test('the report lists why we missed, and a case with nothing on either side', () => {
  const quiet: CrossCase = { label: 'quiet', base: 'a'.repeat(40), head: 'b'.repeat(40), theirs: [] };
  const report = crossCheckReport([crossCheck(CASE, OURS), crossCheck(quiet, [])]);
  assert.match(report, /2 commits; sw-impact findings: 6, found by both: 2, only ours: 1\./u);
  assert.match(report, /\| prop \| 1 \| 2 \| 50% \|/u);
  assert.match(report, /- no-detail: prop types \(1\)/u);
  assert.match(report, /## quiet\n\n`aaaaaaaaaa\.\.bbbbbbbbbb`\n\n- no breaks on either side/u);
});

const reportOnce = (): string => crossCheckReport([crossCheck(CASE, OURS)]);

test('the same input gives the same report', () => {
  assert.equal(reportOnce(), reportOnce());
});
