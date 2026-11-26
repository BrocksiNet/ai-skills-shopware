import assert from 'node:assert/strict';
import { test } from 'node:test';
import { diffSnapshots, diffSummary, diffText, isBreak } from '../src/api-diff.ts';
import { bcChangeAffects, formatBcAffects } from '../src/bc-change.ts';
import { factsFor, Lookup } from '../src/facts.ts';
import type { Item, Snapshot } from '../src/model.ts';
import { phpItems } from '../src/php.ts';
import { describe } from '../src/report.ts';
import { mergeSnapshots } from '../src/timeline.ts';
import { parseVerificationReport } from '../src/verification-report.ts';

function snapshot(ref: string, items: Item[]): Snapshot {
  return { schema: 1, generator: 'test', ref, sha: `sha-${ref}`, builtAt: '2026-11-26T00:00:00Z', failed: [], items };
}

function method(name: string, bcChanges?: string[]): Item {
  return {
    id: `php:Shopware\\Core\\Service::${name}()`,
    kind: 'method',
    file: 'src/Core/Service.php',
    visibility: 'public',
    signature: '(): void',
    flags: bcChanges === undefined ? {} : { bcChanges },
  };
}

const service: Item = { id: 'php:Shopware\\Core\\Service', kind: 'class', file: 'src/Core/Service.php', flags: {} };

test('BCChange attribution maps caller-only, extender-only, combined, and unknown attributes', () => {
  assert.deepEqual(bcChangeAffects(['ParameterNameChange@v6.8.0']), ['callers']);
  assert.deepEqual(bcChangeAffects(['ExceptionChange@v6.8.0']), ['callers']);
  assert.deepEqual(bcChangeAffects(['ReturnTypeWidening@v6.8.0']), ['callers']);
  assert.deepEqual(bcChangeAffects(['ReturnTypeNarrowing@v6.8.0']), ['extenders']);
  assert.deepEqual(bcChangeAffects(['BecomesFinal@v6.8.0']), ['extenders']);
  assert.deepEqual(bcChangeAffects(['NewOptionalParameter@v6.8.0']), ['extenders']);
  assert.deepEqual(bcChangeAffects(['NewRequiredParameter@v6.8.0']), ['callers', 'extenders']);
  assert.deepEqual(bcChangeAffects(['ParameterRemoval@v6.8.0']), ['callers', 'extenders']);
  // Combining a caller-only and an extender-only attribute produces both in canonical order.
  assert.deepEqual(bcChangeAffects(['ReturnTypeNarrowing@v6.8.0', 'ParameterNameChange@v6.8.0']), [
    'callers',
    'extenders',
  ]);
  assert.equal(bcChangeAffects(['FutureUnknownAttribute@v6.9.0']), undefined);
  assert.equal(formatBcAffects(['callers']), 'callers');
  assert.equal(formatBcAffects(['extenders']), 'extenders');
  assert.equal(formatBcAffects(['callers', 'extenders']), 'callers and extenders');
  assert.equal(formatBcAffects([]), '');
});

test('phpItems reads both named and positional version arguments on BCChange attributes', () => {
  const code = `<?php
namespace Shopware\\Core;
use Shopware\\Core\\Framework\\Deprecation\\BCChange\\ParameterNameChange;
use Shopware\\Core\\Framework\\Deprecation\\BCChange\\ReturnTypeNarrowing;

class Service {
    #[ParameterNameChange('v6.8.0')]
    public function callerOnly(): void {}

    #[ReturnTypeNarrowing(version: 'v6.8.0')]
    public function extenderOnly(): void {}
}
`;
  const items = phpItems(code, 'src/Core/Service.php');
  assert.deepEqual(items.find((item) => item.id.endsWith('::callerOnly()'))?.flags.bcChanges, [
    'ParameterNameChange@v6.8.0',
  ]);
  assert.deepEqual(items.find((item) => item.id.endsWith('::extenderOnly()'))?.flags.bcChanges, [
    'ReturnTypeNarrowing@v6.8.0',
  ]);
});

test('api-facts attaches caller, extender, and combined affects to bc-change facts and text', () => {
  const lookup = new Lookup(
    mergeSnapshots([
      snapshot('v6.7.0.0', [
        service,
        method('caller', ['ParameterNameChange@v6.8.0']),
        method('extender', ['ReturnTypeNarrowing@v6.8.0']),
        method('bothSingle', ['NewRequiredParameter@v6.8.0']),
        method('bothPair', ['ReturnTypeNarrowing@v6.8.0', 'ExceptionChange@v6.8.0']),
        method('unknown', ['CustomFutureChange@v6.9.0']),
      ]),
    ]),
  );

  const [caller] = factsFor(lookup, 'php:Shopware\\Core\\Service::caller()', 'call', ['6.7.0.0']);
  assert.ok(caller !== undefined);
  assert.deepEqual(caller.affects, ['callers']);
  assert.equal(describe(caller), 'announced change ParameterNameChange@v6.8.0 (affects callers) in 6.7.0.0');

  const [extender] = factsFor(lookup, 'php:Shopware\\Core\\Service::extender()', 'override', ['6.7.0.0']);
  assert.ok(extender !== undefined);
  assert.deepEqual(extender.affects, ['extenders']);
  assert.equal(describe(extender), 'announced change ReturnTypeNarrowing@v6.8.0 (affects extenders) in 6.7.0.0');

  const [bothSingle] = factsFor(lookup, 'php:Shopware\\Core\\Service::bothSingle()', 'call', ['6.7.0.0']);
  assert.ok(bothSingle !== undefined);
  assert.deepEqual(bothSingle.affects, ['callers', 'extenders']);
  assert.equal(
    describe(bothSingle),
    'announced change NewRequiredParameter@v6.8.0 (affects callers and extenders) in 6.7.0.0',
  );

  const [bothPair] = factsFor(lookup, 'php:Shopware\\Core\\Service::bothPair()', 'call', ['6.7.0.0']);
  assert.ok(bothPair !== undefined);
  assert.deepEqual(bothPair.affects, ['callers', 'extenders']);
  assert.equal(
    describe(bothPair),
    'announced change ReturnTypeNarrowing@v6.8.0, ExceptionChange@v6.8.0 (affects callers and extenders) in 6.7.0.0',
  );

  const [unknown] = factsFor(lookup, 'php:Shopware\\Core\\Service::unknown()', 'call', ['6.7.0.0']);
  assert.ok(unknown !== undefined);
  assert.equal(unknown.affects, undefined);
  assert.equal(describe(unknown), 'announced change CustomFutureChange@v6.9.0 in 6.7.0.0');

  // Verification report parser accepts bc-change facts with affects.
  const parsed = parseVerificationReport(
    { releases: ['6.7.0.0'], symbols: ['php:Shopware\\Core\\Service::caller()'], facts: [caller] },
    'facts.json',
  );
  assert.deepEqual(parsed.facts[0]?.affects, ['callers']);
});

const BC_DIFF_BASE = snapshot('v6.7.0.0', [
  service,
  method('caller'),
  method('extender'),
  method('both'),
  method('unchanged', ['BecomesFinal@v6.8.0']),
]);

const BC_DIFF_HEAD = snapshot('v6.7.1.0', [
  service,
  method('caller', ['ParameterDefaultValueChange@v6.8.0']),
  method('extender', ['NewOptionalParameter@v6.8.0']),
  method('both', ['ParameterRemoval@v6.8.0']),
  method('unchanged', ['BecomesFinal@v6.8.0']),
]);

test('api-diff reports newly announced BCChange attributes with caller/extender attribution and not as breaks', () => {
  const diff = diffSnapshots(BC_DIFF_BASE, BC_DIFF_HEAD, ['php']);
  assert.equal(diff.changes.length, 3);
  assert.equal(
    diff.changes.some((change) => isBreak(change)),
    false,
  );
  assert.deepEqual(
    diff.changes.map((change) => ({
      id: change.id,
      kind: change.kind,
      affects: change.affects,
      detail: change.detail,
    })),
    [
      {
        id: 'php:Shopware\\Core\\Service::caller()',
        kind: 'bc-change',
        affects: ['callers'],
        detail: 'ParameterDefaultValueChange@v6.8.0 (affects callers)',
      },
      {
        id: 'php:Shopware\\Core\\Service::extender()',
        kind: 'bc-change',
        affects: ['extenders'],
        detail: 'NewOptionalParameter@v6.8.0 (affects extenders)',
      },
      {
        id: 'php:Shopware\\Core\\Service::both()',
        kind: 'bc-change',
        affects: ['callers', 'extenders'],
        detail: 'ParameterRemoval@v6.8.0 (affects callers and extenders)',
      },
    ],
  );
  assert.match(diffSummary(diff), /3 new BC changes\.$/u);
  const text = diffText(diff);
  assert.match(
    text,
    /- bc change: php:Shopware\\Core\\Service::caller\(\): ParameterDefaultValueChange@v6\.8\.0 \(affects callers\)/u,
  );
  assert.match(
    text,
    /- bc change: php:Shopware\\Core\\Service::extender\(\): NewOptionalParameter@v6\.8\.0 \(affects extenders\)/u,
  );
  assert.match(
    text,
    /- bc change: php:Shopware\\Core\\Service::both\(\): ParameterRemoval@v6\.8\.0 \(affects callers and extenders\)/u,
  );
});
