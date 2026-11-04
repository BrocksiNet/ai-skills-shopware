import assert from 'node:assert/strict';
import { test } from 'node:test';
import { referenceReads } from '../src/reference-reads.ts';

const ref = 'sw-storefront/references/js-plugins.md';
const source = '# Storefront JavaScript plugins\n\nKeep the released plugin option names working.\n';
const references = new Map([[ref, source]]);
const call = (id: string, name: string, input: object): object => ({
  type: 'assistant',
  message: { content: [{ type: 'tool_use', id, name, input }] },
});
const result = (id: string, content: unknown, isError = false): object => ({
  type: 'user',
  message: { content: [{ type: 'tool_result', tool_use_id: id, content, is_error: isError }] },
});
const trace = (...events: object[]): string =>
  [{ type: 'system', subtype: 'init' }, ...events].map((e) => JSON.stringify(e)).join('\n');

test('successful reference content returned by Read is observable, including numbered output', () => {
  const observed = referenceReads(
    trace(
      call('r', 'Read', { file_path: `/tmp/project/.claude/skills/${ref}` }),
      result('r', [
        { type: 'text', text: '1→# Storefront JavaScript plugins\n3→Keep the released plugin option names working.' },
      ]),
    ),
    references,
  );
  assert.equal(observed.observable, true);
  assert.deepEqual(observed.reads, [{ reference: ref, tool: 'Read', call_id: 'r' }]);
});
test('citations, failed reads, path echoes, and directory listings are not retrieval', () => {
  const observed = referenceReads(
    trace(
      { type: 'assistant', message: { content: [{ type: 'text', text: `I read ${ref}` }] } },
      call('failed', 'Read', { file_path: `/tmp/${ref}` }),
      result('failed', source, true),
      call('empty', 'Read', { file_path: `/tmp/${ref}` }),
      result('empty', ref),
      call('ls', 'Bash', { command: `ls /tmp/${ref}` }),
      result('ls', ref),
    ),
    references,
  );
  assert.deepEqual(observed.reads, []);
});
test('a successful literal shell read confirms complete reference content', () => {
  assert.equal(
    referenceReads(trace(call('cat', 'Bash', { command: `cat /tmp/${ref}` }), result('cat', source)), references).reads
      .length,
    1,
  );
  assert.equal(
    referenceReads(trace(call('cat', 'Bash', { command: `cat /tmp/${ref}` }), result('cat', source, true)), references)
      .reads.length,
    0,
  );
});
test('literal shell excerpts count with returned source content, including cd into a skill', () => {
  for (const command of [
    `sed -n '3,5p' /tmp/.claude/skills/${ref}`,
    'cd /tmp/.claude/skills/sw-storefront && sed -n 3,5p references/js-plugins.md',
    'cd /tmp/.claude/skills/sw-storefront/references && sed -n 3,5p js-plugins.md',
    'cd /tmp/.claude/skills/sw-storefront/references && cat js-plugins.md other.md',
    'R=.claude/skills/sw-storefront/references; cat $R/js-plugins.md',
    `grep -n released /tmp/.claude/skills/${ref}`,
  ]) {
    const seen = referenceReads(
      trace(call('r', 'Bash', { command }), result('r', '3:Keep the released plugin option names working.')),
      references,
    );
    assert.deepEqual(seen.reads, [{ reference: ref, tool: 'Bash', call_id: 'r', extent: 'excerpt' }]);
  }
});
test('a path mention and source quote do not establish a shell file read', () => {
  for (const command of [
    `echo '${ref}'`,
    `ls /tmp/${ref}`,
    `echo '${ref}'; cat other.md`,
    'cd /tmp/another-skill && sed -n 3,5p references/js-plugins.md',
    'cat $R/js-plugins.md',
    'R=.claude/skills/sw-storefront/references; R=elsewhere; cat $R/js-plugins.md',
  ])
    assert.deepEqual(referenceReads(trace(call('r', 'Bash', { command }), result('r', source)), references).reads, []);
});
test('missing and unsupported traces are unobservable rather than zero-retrieval scores', () => {
  assert.equal(referenceReads('', references).observable, false);
  assert.equal(referenceReads('{"type":"tool.execution_start"}', references).observable, false);
});
