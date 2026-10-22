import assert from 'node:assert/strict';
import { test } from 'node:test';
import { diffSnapshots, diffText } from '../src/api-diff.ts';
import { checkMajor, covers, type KnownBreaks, totals } from '../src/known-breaks.ts';
import type { Item, Snapshot } from '../src/model.ts';
import { mergeSnapshots, snapshotAt } from '../src/timeline.ts';

function snapshot(ref: string, items: Item[]): Snapshot {
  return { schema: 1, generator: 'test', ref, sha: `sha-${ref}`, builtAt: '2026-10-22T00:00:00Z', failed: [], items };
}

function entry(id: string, signature: string, flags: Item['flags'] = {}, extra: Partial<Item> = {}): Item {
  const kind = id.split(':')[0];
  assert.ok(
    kind === 'route' || kind === 'entity' || kind === 'field' || kind === 'feature' || kind === 'config',
    `bad id ${id}`,
  );
  return { id, kind, file: 'f', signature, flags, ...extra };
}

const BASE = snapshot('v1', [
  entry('route:api.a', 'GET /api/a', {}, { scope: 'api' }),
  entry('route:api.b', 'POST /api/b'),
  entry('route:api.old', 'GET /api/old', { deprecated: 'v2.0.0' }),
  entry('route:api.moved', 'GET /api/moved'),
  entry('route:api.internal', 'GET /api/internal', { internal: true }),
  entry('entity:gone', 'GoneDefinition'),
  entry('field:gone.name', 'StringField ApiAware'),
  entry('entity:product', 'ProductDefinition'),
  entry('field:product.stock', 'IntField ApiAware'),
  entry('field:product.name', 'StringField ApiAware'),
  entry('field:product.mail', 'StringField'),
  entry('config:shopware.cache', 'array'),
  entry('config:shopware.cache.ttl', 'integer = 60', { deprecated: 'v2.0.0' }),
  entry('config:shopware.cache.dsn', 'scalar', { deprecated: 'v2.0.0' }),
  entry('feature:FLAG', 'default=false major=false toggleable=-'),
]);

const HEAD = snapshot('v2', [
  entry('route:api.a', 'GET /api/a2', {}, { scope: 'store-api' }),
  entry('route:api.b', 'GET|POST /api/b'),
  entry('route:api.renamed', 'GET /api/moved'),
  entry('entity:product', 'ProductDefinition'),
  entry('field:product.stock', 'IntField ApiAware WriteProtected'),
  entry('field:product.name', 'StringField', { deprecated: 'v3.0.0' }),
  entry('field:product.mail', 'EmailField'),
]);

test('api-diff: breaks, announced removals, collapsed owners, moved routes, new deprecations', () => {
  const diff = diffSnapshots(BASE, HEAD);
  const byId = new Map(diff.changes.map((change) => [`${change.kind} ${change.id}`, change]));
  assert.equal(byId.get('changed route:api.a')?.detail, 'path /api/a → /api/a2, scope api → store-api');
  // Gaining a method breaks nothing.
  assert.ok(!byId.has('changed route:api.b'));
  assert.equal(byId.get('removed route:api.old')?.announced, true);
  assert.equal(byId.get('removed route:api.moved')?.movedTo, 'route:api.renamed');
  assert.equal(diff.skipped, 1);
  // The entity is reported, not each of its fields.
  assert.ok(byId.has('removed entity:gone'));
  assert.ok(!byId.has('removed field:gone.name'));
  assert.equal(byId.get('changed field:product.stock')?.detail, 'now WriteProtected');
  assert.equal(byId.get('changed field:product.name')?.detail, 'no longer ApiAware');
  assert.equal(byId.get('deprecated field:product.name')?.detail, 'deprecated for v3.0.0');
  assert.equal(byId.get('changed field:product.mail')?.detail, 'type StringField → EmailField');
  // Every child key was deprecated, so the parent's removal was announced.
  assert.equal(byId.get('removed config:shopware.cache')?.announced, true);
  assert.ok(!byId.has('removed config:shopware.cache.ttl'));
  assert.equal(byId.get('removed feature:FLAG')?.announced, undefined);
  const text = diffText(diff);
  assert.match(
    text,
    /- BREAK removed: route:api\.moved: removed \(GET \/api\/moved\) \(same path now route:api\.renamed\)/u,
  );
  assert.match(text, /- removed after deprecation: route:api\.old/u);
  assert.match(text, /breaks without a deprecation in v1, 1 internal or experimental items skipped/u);
});

test('api-diff: a key whose parent became a prototype is not removed', () => {
  const base = snapshot('v1', [entry('config:a.sc', 'array'), entry('config:a.sc.default', 'array')]);
  const head = snapshot('v2', [entry('config:a.sc', 'array'), entry('config:a.sc.*', 'array')]);
  assert.deepEqual(diffSnapshots(base, head).changes, []);
});

test('api-diff: surfaces filter, php reports removals only', () => {
  const base = snapshot('v1', [
    { id: 'php:A', kind: 'class', file: 'A.php', flags: {} },
    { id: 'php:A::run()', kind: 'method', file: 'A.php', signature: '(): void', flags: {} },
  ]);
  const head = snapshot('v2', []);
  assert.deepEqual(diffSnapshots(base, head, ['route']).changes, []);
  const changes = diffSnapshots(base, head, ['php']).changes;
  assert.deepEqual(
    changes.map((change) => [change.id, change.detail]),
    [['php:A', 'removed (also checked by bc-check)']],
  );
});

test('snapshotAt: rebuilds the items of one release from the timeline', () => {
  const timeline = mergeSnapshots([BASE, HEAD]);
  const at = snapshotAt(timeline, 'v2');
  assert.ok(at);
  const field = at.items.find((item) => item.id === 'field:product.name');
  assert.deepEqual(field?.flags, { deprecated: 'v3.0.0' });
  assert.equal(at.items.find((item) => item.id === 'route:api.a')?.scope, 'store-api');
  assert.equal(at.items.length, HEAD.items.length);
  assert.equal(snapshotAt(timeline, 'v9'), undefined);
});

test('known breaks: an owner covers its fields and child keys', () => {
  assert.ok(covers('entity:gone', 'field:gone.name'));
  assert.ok(!covers('entity:gone', 'field:gone_translation.name'));
  assert.ok(covers('config:shopware.cache', 'config:shopware.cache.ttl'));
  assert.ok(!covers('config:shopware.cache', 'config:shopware.cache_other'));
});

test('known breaks: recall and precision per major', () => {
  const known: KnownBreaks = {
    majors: [
      { major: '2', base: 'v1', head: 'v2', expect: 'removed' },
      { major: '3', base: 'v2', head: 'trunk', expect: 'deprecated' },
    ],
    breaks: [
      { major: '2', id: 'field:gone.name', kind: 'removed', heading: '' },
      { major: '2', id: 'route:api.old', kind: 'removed', heading: '' },
      { major: '2', id: 'route:api.never', kind: 'removed', heading: '' },
      { major: '2', id: 'config:not.a.key', kind: 'removed', heading: '', excluded: 'a parameter' },
      { major: '3', id: 'field:product.name', kind: 'removed', heading: '' },
    ],
    confirmed: [{ major: '2', id: 'route:api.a', evidence: 'path changed' }],
  };
  const two = known.majors[0];
  const three = known.majors[1];
  assert.ok(two && three);
  const first = checkMajor(two, known, diffSnapshots(BASE, HEAD).changes, HEAD);
  assert.deepEqual(first.known, ['field:gone.name', 'route:api.old', 'route:api.never']);
  assert.deepEqual(first.found, ['field:gone.name', 'route:api.old']);
  assert.ok(first.right.includes('entity:gone') && first.right.includes('route:api.a'));
  assert.ok(!first.right.includes('field:product.stock'));
  // A major on trunk finds a break the head deprecates, even with no change.
  const second = checkMajor(three, known, [], HEAD);
  assert.deepEqual(second.found, ['field:product.name']);
  const { recall } = totals([first, second]);
  assert.equal(recall, 3 / 4);
});
