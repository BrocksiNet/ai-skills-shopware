// Admin props, methods and computed members with their signatures: what the
// index reads, what api-diff reports, and the facts a plugin's override gets.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ADMIN_SRC, componentItems, registrations } from '../src/admin.ts';
import { diffSnapshots, isBreak } from '../src/api-diff.ts';
import { factsFor, Lookup } from '../src/facts.ts';
import { computedChange, methodChange, parseMethod, propChange, splitTop } from '../src/member-signature.ts';
import type { Item, Snapshot } from '../src/model.ts';
import { describe } from '../src/report.ts';
import { mergeSnapshots } from '../src/timeline.ts';

function itemsOf(files: Map<string, string>): Item[] {
  const names = new Set(files.keys());
  return [...files].flatMap(([path, code]) =>
    path.endsWith('.twig') || !path.endsWith('main.ts')
      ? []
      : registrations(code, path, names).flatMap((registration) =>
          componentItems(registration, (file) => files.get(file)),
        ),
  );
}

function snapshot(ref: string, items: Item[]): Snapshot {
  return { schema: 1, generator: 'test', ref, sha: `sha-${ref}`, builtAt: '2026-11-12T00:00:00Z', failed: [], items };
}

const signatureOf = (items: Item[], id: string): string | undefined => items.find((item) => item.id === id)?.signature;

const SW_A = new Map([
  [`${ADMIN_SRC}/main.ts`, "Shopware.Component.register('sw-a', () => import('./sw-a'));"],
  [
    `${ADMIN_SRC}/sw-a/index.ts`,
    [
      'export default Shopware.Component.wrapComponentConfig({',
      '    props: {',
      "        entity: { type: Object as PropType<Entity<'product'>>, required: true },",
      '        size: { type: [String, Number], required: false },',
      '        any: {},',
      '    },',
      '    computed: {',
      '        classes(): Record<string, boolean> { return {}; },',
      '        plain() { return 1; },',
      "        value: { get(): string { return ''; }, set(next: string) {} },",
      '    },',
      '    methods: {',
      "        onChange(event: Event, axis: 'x' | 'y' = 'x', ...rest: number[]): void {},",
      '        async load({ id }: { id: string }, [first]: string[], options?: { a: 1 }) {},',
      '        arrow: (a) => a,',
      '    },',
      '});',
    ].join('\n'),
  ],
]);

test('admin: method, computed and prop signatures as the source writes them', () => {
  const items = itemsOf(SW_A);
  assert.equal(signatureOf(items, 'admin:sw-a.prop.entity'), "required Object as Entity<'product'>");
  assert.equal(signatureOf(items, 'admin:sw-a.prop.size'), 'optional String|Number');
  assert.equal(signatureOf(items, 'admin:sw-a.prop.any'), 'optional');
  assert.equal(signatureOf(items, 'admin:sw-a.computed.classes'), 'returns Record<string, boolean>');
  assert.equal(signatureOf(items, 'admin:sw-a.computed.plain'), '');
  assert.equal(signatureOf(items, 'admin:sw-a.computed.value'), 'returns string, settable');
  assert.equal(
    signatureOf(items, 'admin:sw-a.js-method.onChange'),
    "(event: Event, axis?: 'x' | 'y', ...rest: number[]): void",
  );
  assert.equal(
    signatureOf(items, 'admin:sw-a.js-method.load'),
    'async ({}: { id: string }, []: string[], options?: { a: 1 })',
  );
  assert.equal(signatureOf(items, 'admin:sw-a.js-method.arrow'), '(a)');
});

test('a method signature reads back as written', () => {
  assert.deepEqual(parseMethod('async ({}: { id: string }, []: string[], options?: { a: 1 })')?.params, [
    { name: '{}', optional: false, rest: false, type: '{ id: string }' },
    { name: '[]', optional: false, rest: false, type: 'string[]' },
    { name: 'options', optional: true, rest: false, type: '{ a: 1 }' },
  ]);
  assert.deepEqual(splitTop('a: Map<string, (x: number) => void>, b', ','), [
    'a: Map<string, (x: number) => void>',
    'b',
  ]);
});

test('methods: what breaks a caller or an override, by position', () => {
  assert.equal(methodChange('()', '(id)'), 'new required parameter id');
  assert.equal(methodChange('(a?)', '(a)'), 'new required parameter a');
  assert.equal(methodChange('(a, b)', '(a)'), 'parameter b removed');
  assert.equal(methodChange('(a: string)', '(a: number)'), 'parameter a type string → number');
  assert.equal(methodChange('(): string', '(): number'), 'returns string → number');
  assert.equal(methodChange('(a)', 'async (a)'), 'now async');
  // Not a change: an optional or rest parameter, a rename, a type where
  // there was none (a file moving to TypeScript), an older index.
  assert.equal(methodChange('(a)', '(a, b?)'), undefined);
  assert.equal(methodChange('(a, b)', '(a, ...rest)'), undefined);
  assert.equal(methodChange('(a)', '(b)'), undefined);
  assert.equal(methodChange('(a)', '(a: string): void'), undefined);
  assert.equal(methodChange('', '(a)'), undefined);
});

test('props and computed members: narrowing breaks, widening does not', () => {
  assert.equal(propChange('optional String', 'required String'), 'now required');
  assert.equal(propChange('optional Boolean', 'optional String'), 'type Boolean → String');
  assert.equal(propChange('optional String|Number', 'optional String'), 'type String|Number → String');
  assert.equal(propChange('optional String', 'optional String|Number'), undefined);
  assert.equal(propChange('optional Object as A', 'optional Object as B'), 'type A → B');
  assert.equal(propChange('optional', 'optional String'), undefined);
  // An index from before prop types still compares the required flag.
  assert.equal(propChange('optional', 'required'), 'now required');
  assert.equal(computedChange('returns A', 'returns B'), 'type A → B');
  assert.equal(computedChange('returns A, settable', 'returns A'), 'no longer settable');
  assert.equal(computedChange('', 'returns A'), undefined);
});

// Core commit 4b703ef1df..ee2ec6e67b (a test PR for sw-impact): the
// components' members before and after, as the diff shows them.
const component = (name: string, file: string, body: string[]): [string, string][] => [
  [`${ADMIN_SRC}/${name}/${file}`, ['export default {', ...body, '};'].join('\n')],
];
function release(after: boolean): Map<string, string> {
  return new Map([
    [
      `${ADMIN_SRC}/main.ts`,
      ['sw-vector-field', 'sw-cms-sidebar-nav-element', 'sw-order-address-modal']
        .map((name) => `Shopware.Component.register('${name}', () => import('./${name}'));`)
        .join('\n'),
    ],
    ...component('sw-vector-field', 'index.ts', [
      '    computed: {',
      `        classes(): Record<string, ${after ? 'string' : 'boolean'}> { return {}; },`,
      '    },',
      '    methods: {',
      `        onChange(event: Event, axis: ${after ? "'x' | 'y'" : "'x' | 'y' | 'z'"}) {},`,
      '    },',
    ]),
    ...component('sw-cms-sidebar-nav-element', 'index.ts', [
      '    props: {',
      `        removable: { type: ${after ? 'String' : 'Boolean'}, required: ${after ? 'true' : 'false'} },`,
      after ? '        added: { type: String, required: true },' : '',
      '    },',
      '    methods: {',
      `        onBlockDuplicate(${after ? 'addedRequiredParam: string' : ''}) {},`,
      `        onBlockDelete()${after ? ': boolean' : ''} { return true; },`,
      '    },',
    ]),
    ...component('sw-order-address-modal', 'index.js', [
      `    props: { versionContext: { type: ${after ? 'String' : 'Object'}, required: true } },`,
      '    computed: {',
      after ? '' : "        customFieldSetRepository() { return this.repositoryFactory.create('custom_field_set'); },",
      '    },',
      `    methods: { getCustomFieldSetData(${after ? 'requiredParamAdded' : ''}) {} },`,
    ]),
  ]);
}

test('api-diff: the sw-impact test PR, member by member', () => {
  const diff = diffSnapshots(snapshot('a', itemsOf(release(false))), snapshot('b', itemsOf(release(true))), ['admin']);
  assert.deepEqual(diff.changes.map((change) => `${change.kind} ${change.id} ${change.detail}`).toSorted(), [
    'changed admin:sw-cms-sidebar-nav-element.js-method.onBlockDuplicate new required parameter addedRequiredParam',
    'changed admin:sw-cms-sidebar-nav-element.prop.added new required prop',
    'changed admin:sw-cms-sidebar-nav-element.prop.removable now required, type Boolean → String',
    'changed admin:sw-order-address-modal.js-method.getCustomFieldSetData new required parameter requiredParamAdded',
    'changed admin:sw-order-address-modal.prop.versionContext type Object → String',
    'changed admin:sw-vector-field.computed.classes type Record<string, boolean> → Record<string, string>',
    "changed admin:sw-vector-field.js-method.onChange parameter axis type 'x' | 'y' | 'z' → 'x' | 'y'",
    'removed admin:sw-order-address-modal.computed.customFieldSetRepository removed',
  ]);
  assert.ok(diff.changes.every((change) => isBreak(change)));
  // Two runs on the same commit give the same items.
  assert.equal(JSON.stringify(itemsOf(release(true))), JSON.stringify(itemsOf(release(true))));
});

const prop = (name: string, signature: string, flags: Item['flags'] = {}): Item => ({
  id: `admin:sw-a.prop.${name}`,
  kind: 'prop',
  file: 'a.ts',
  signature,
  flags,
});
const method = (signature: string): Item => ({
  id: 'admin:sw-a.js-method.save',
  kind: 'js-method',
  file: 'a.ts',
  signature,
  flags: {},
});

test('api-diff: a new optional prop, a prop behind the flag, or a new component is no change', () => {
  const owner: Item = { id: 'admin:sw-a', kind: 'component', file: 'a.ts', signature: 'register', flags: {} };
  const fresh: Item = { id: 'admin:sw-b', kind: 'component', file: 'b.ts', signature: 'register', flags: {} };
  const head = [
    owner,
    prop('soft', 'optional String'),
    prop('gated', 'required String', { from: 'v6.8.0' }),
    fresh,
    { ...prop('x', 'required String'), id: 'admin:sw-b.prop.x' },
  ];
  assert.deepEqual(diffSnapshots(snapshot('a', [owner]), snapshot('b', head), ['admin']).changes, []);
});

test('facts: an overridden method whose parameters changed inside the range', () => {
  const owner: Item = { id: 'admin:sw-a', kind: 'component', file: 'a.ts', signature: 'register', flags: {} };
  const lookup = new Lookup(
    mergeSnapshots([
      snapshot('v6.7.0.0', [owner, method('(item)')]),
      snapshot('v6.7.1.0', [owner, method('(item: Entity)')]),
      snapshot('v6.7.2.0', [owner, method('(item: Entity, context: Context)')]),
    ]),
  );
  const facts = factsFor(lookup, 'admin:sw-a.js-method.save', 'override', ['6.7.0.0', '6.7.1.0', '6.7.2.0']);
  assert.deepEqual(
    facts.map((fact) => describe(fact)),
    ['new required parameter context in 6.7.2.0'],
  );
});
