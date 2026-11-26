// Historical 6.5-6.7 Admin snippet placeholders and plural forms tests (descoped WP C).
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { adminSnippetItems, snippetChange, snippetSignature } from '../src/admin-snippets.ts';
import { diffSnapshots } from '../src/api-diff.ts';
import { Lookup } from '../src/facts.ts';
import { factsOfDir } from '../src/report.ts';
import { mergeSnapshots } from '../src/timeline.ts';

type Items = ReturnType<typeof adminSnippetItems>;

function snapshot(ref: string, items: Items): Parameters<typeof diffSnapshots>[0] {
  return { schema: 1, generator: 'test', ref, sha: `sha-${ref}`, builtAt: '2026-11-26T00:00:00Z', failed: [], items };
}

test('Admin snippet signatures detect placeholder renames and shrunk plurals, not wording edits', () => {
  assert.equal(snippetSignature('Save'), '');
  assert.equal(snippetSignature('Saved "{entityName}" by {user}'), 'placeholders=entityName,user');
  assert.equal(snippetSignature('No items | 1 item | {count} items'), 'plurals=3 placeholders=count');
  assert.equal(snippetChange('placeholders=count', 'placeholders=count'), undefined);
  assert.equal(snippetChange('plurals=2 placeholders=count', 'plurals=3 placeholders=count'), undefined);
  assert.equal(snippetChange('plurals=3 placeholders=count', 'plurals=1 placeholders=count'), 'plurals 3 → 1');
  assert.equal(snippetChange('placeholders=entityName', 'placeholders=name'), 'placeholders {entityName} → {name}');
});

test('Admin snippets: api-diff and extension api-facts catch removals and placeholder changes', () => {
  const file = 'src/Administration/Resources/app/administration/src/app/snippet/en-GB.json';
  const json66 = JSON.stringify({
    global: {
      default: { save: 'Save', oldKey: 'Old' },
      notification: { saved: 'Saved "{entityName}"', items: 'No items | 1 item | {count} items' },
    },
  });
  const json67 = JSON.stringify({
    global: {
      default: { save: 'Save changes' },
      notification: { saved: 'Saved "{name}"', items: '{count} items' },
    },
  });

  const items66 = adminSnippetItems(json66, file);
  const items67 = adminSnippetItems(json67, file);

  const diff = diffSnapshots(snapshot('v6.6.0.0', items66), snapshot('v6.7.0.0', items67), ['admin']);
  const byId = new Map(diff.changes.map((change) => [change.id, change]));
  assert.equal(byId.has('snippet:global.default.save'), false);
  assert.equal(byId.get('snippet:global.default.oldKey')?.kind, 'removed');
  assert.equal(byId.get('snippet:global.notification.saved')?.detail, 'placeholders {entityName} → {name}');
  assert.equal(byId.get('snippet:global.notification.items')?.detail, 'plurals 3 → 1');

  const dir = mkdtempSync(join(tmpdir(), 'wpc-snippet-facts-'));
  try {
    const js = join(dir, 'src/Resources/app/administration/src/component/my-cmp/index.js');
    const twig = join(dir, 'src/Resources/app/administration/src/component/my-cmp/my-cmp.html.twig');
    mkdirSync(join(js, '..'), { recursive: true });
    writeFileSync(
      js,
      "export default { methods: { ok() { return this.$t('global.notification.saved') + this.$t('my-plugin.own.key'); } } };",
    );
    writeFileSync(twig, "<span>{{ $tc('global.default.oldKey') }}</span>");
    const lookup = new Lookup(mergeSnapshots([snapshot('v6.6.0.0', items66), snapshot('v6.7.0.0', items67)]));
    const report = factsOfDir(lookup, dir, '~6.6.0 || ~6.7.0');
    assert.deepEqual(
      report.facts.map((fact) => [fact.kind, fact.target, fact.value]),
      [
        ['missing', 'snippet:global.default.oldKey', undefined],
        ['signature', 'snippet:global.notification.saved', 'placeholders {entityName} → {name}'],
      ],
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
