import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { Lookup } from '../src/facts.ts';
import type { Item, Snapshot } from '../src/model.ts';
import { factsOfDir } from '../src/report.ts';
import { mergeSnapshots } from '../src/timeline.ts';

const event: Item = { id: 'php:Shopware\\Core\\Event', kind: 'class', file: 'src/Event.php', flags: {} };
const hash: Item = {
  id: 'php:Shopware\\Core\\Event::hash()',
  kind: 'method',
  file: 'src/Event.php',
  visibility: 'public',
  signature: '(): string',
  flags: {},
};

function snapshot(ref: string, items: Item[]): Snapshot {
  return { schema: 1, generator: 'test', ref, sha: `sha-${ref}`, builtAt: '2026-10-22T00:00:00Z', failed: [], items };
}

// The class arrives in 6.6.6.0, its hash() only in 6.7.6.0.
const lookup = new Lookup(
  mergeSnapshots([
    snapshot('v6.6.0.0', []),
    snapshot('v6.6.6.0', [event]),
    snapshot('v6.7.0.0', [event]),
    snapshot('v6.7.6.0', [event, hash]),
  ]),
);

function factsOf(services: string, subscriber: string): Map<string, string | undefined> {
  const dir = mkdtempSync(join(tmpdir(), 'api-facts-'));
  try {
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src/services.php'), `<?php\nuse Shopware\\Core\\Event;\n${services}\n`);
    writeFileSync(
      join(dir, 'src/Subscriber.php'),
      `<?php\nuse Shopware\\Core\\Event;\nclass Subscriber {\n  public function on(Event $event): void {\n${subscriber}\n  }\n}\n`,
    );
    const report = factsOfDir(lookup, dir, '~6.6.0 || ~6.7.0');
    return new Map(
      report.facts
        .filter((fact) => fact.kind === 'missing')
        .map((fact) => [
          fact.target,
          fact.unguarded === undefined ? fact.guard?.file : `open ${JSON.stringify(fact.unguarded)}`,
        ]),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('a class guard covers a member only in releases without the class', () => {
  const facts = factsOf('if (class_exists(Event::class)) { register(); }', '$event->hash();');
  assert.equal(facts.get('php:Shopware\\Core\\Event'), 'src/services.php');
  assert.equal(facts.get('php:Shopware\\Core\\Event::hash()'), 'open [["6.6.6.0","6.7.0.0"]]');
});

test('a method_exists guard covers the member in every release', () => {
  const facts = factsOf(
    'if (class_exists(Event::class)) { register(); }',
    "if (method_exists(Event::class, 'hash')) { $event->hash(); }",
  );
  assert.equal(facts.get('php:Shopware\\Core\\Event::hash()'), 'src/Subscriber.php');
});
