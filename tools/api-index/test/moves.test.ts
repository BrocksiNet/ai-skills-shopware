import assert from 'node:assert/strict';
import { test } from 'node:test';
import { diffSnapshots, diffSummary, diffText, isBreak } from '../src/api-diff.ts';
import { withoutDeclaredAliases } from '../src/build.ts';
import { factsFor, Lookup } from '../src/facts.ts';
import type { Item, Snapshot } from '../src/model.ts';
import { phpItems } from '../src/php.ts';
import { describe } from '../src/report.ts';
import { mergeSnapshots, snapshotAt } from '../src/timeline.ts';

const OLD = 'Shopware\\Core\\Checkout\\Document\\DocumentEntity';
const NEW = 'Shopware\\Core\\Checkout\\Document\\Aggregate\\Document\\DocumentEntity';

function snapshot(ref: string, items: Item[]): Snapshot {
  return { schema: 1, generator: 'test', ref, sha: `sha-${ref}`, builtAt: '2026-11-06T00:00:00Z', failed: [], items };
}

function php(id: string, extra: Partial<Item> = {}): Item {
  return { id: `php:${id}`, kind: id.includes('::') ? 'method' : 'class', file: 'f.php', flags: {}, ...extra };
}

const MOVED_CLASS = `<?php
namespace Shopware\\Core\\Checkout\\Document\\Aggregate\\Document;
use Shopware\\Core\\Framework\\Deprecation\\BCChange\\ClassMoved;
#[ClassMoved(version: 'v6.9.0', previousClassName: '${OLD.replaceAll('\\', '\\\\')}')]
class DocumentEntity { public function getId(): string { return ''; } }
`;

test('#[ClassMoved] adds the previous name as an alias of the class', () => {
  const items = phpItems(MOVED_CLASS, 'src/DocumentEntity.php');
  const alias = items.find((item) => item.id === `php:${OLD}`);
  assert.deepEqual(alias, {
    id: `php:${OLD}`,
    kind: 'class',
    file: 'src/DocumentEntity.php',
    flags: { deprecated: 'v6.9.0' },
    aliasOf: NEW,
  });
  assert.ok(items.some((item) => item.id === `php:${NEW}::getId()`));
  assert.ok(!items.some((item) => item.id === `php:${OLD}::getId()`));
});

test('a previous name that is still declared is not an alias', () => {
  const real = php(OLD);
  const alias = php(OLD, { aliasOf: NEW, flags: { deprecated: 'v6.9.0' } });
  assert.deepEqual(withoutDeclaredAliases([alias, real]), [real]);
  assert.deepEqual(withoutDeclaredAliases([alias]), [alias]);
});

test('aliasOf survives the timeline round trip', () => {
  const alias = php(OLD, { aliasOf: NEW, flags: { deprecated: 'v6.9.0' } });
  const timeline = mergeSnapshots([snapshot('v1', [php(NEW), alias])]);
  assert.equal(snapshotAt(timeline, 'v1')?.items.find((item) => item.id === alias.id)?.aliasOf, NEW);
});

// 6.7.15.0 declares the class at the old name; 6.7.16.0 moves it and keeps an alias.
const BEFORE = snapshot('v6.7.15.0', [php(OLD), php(`${OLD}::getId()`)]);
const AFTER = snapshot('v6.7.16.0', [
  php(NEW),
  php(`${NEW}::getId()`),
  php(OLD, { aliasOf: NEW, flags: { deprecated: 'v6.9.0' } }),
]);

test('a moved class is present under its old name, with its members, and says where it went', () => {
  const lookup = new Lookup(mergeSnapshots([BEFORE, AFTER]));
  const range = ['6.7.15.0', '6.7.16.0'];
  const facts = factsFor(lookup, `php:${OLD}`, 'uses', range);
  assert.deepEqual(
    facts.map((fact) => [fact.kind, describe(fact)]),
    [['moved', `a runtime alias of ${NEW} in 6.7.16.0; the old name goes away in v6.9.0`]],
  );
  assert.deepEqual(factsFor(lookup, `php:${OLD}::getId()`, 'uses', range), []);
  assert.deepEqual(
    factsFor(lookup, `php:${OLD}::gone()`, 'uses', range).map((fact) => fact.kind),
    ['missing'],
  );
});

test('the diff reports a moved class once, as a move, not a break', () => {
  const diff = diffSnapshots(BEFORE, AFTER, ['php']);
  assert.deepEqual(
    diff.changes.map((change) => [change.kind, change.id, change.movedTo, isBreak(change)]),
    [['moved', `php:${OLD}`, `php:${NEW}`, false]],
  );
  assert.match(diffSummary(diff), /^Summary: 0 breaking changes .*, 1 move\.$/u);
  assert.match(diffText(diff), /moved.*the old name is a runtime alias until v6\.9\.0/u);
});

test('a member a parent took over is a move; one no parent declares is a removal', () => {
  const base = snapshot('v1', [
    php('Base'),
    php('Child', { extends: ['Base'] }),
    php('Child::kept()'),
    php('Child::gone()'),
  ]);
  const head = snapshot('v2', [php('Base'), php('Base::kept()'), php('Child', { extends: ['Base'] })]);
  const diff = diffSnapshots(base, head, ['php']);
  assert.deepEqual(
    diff.changes.map((change) => [change.kind, change.id, change.movedTo ?? '', change.detail]),
    [
      ['moved', 'php:Child::kept()', 'php:Base::kept()', 'now declared by Base'],
      ['removed', 'php:Child::gone()', '', 'removed (also checked by bc-check)'],
    ],
  );
  assert.deepEqual(
    diff.changes.map((change) => isBreak(change)),
    [false, true],
  );
});
