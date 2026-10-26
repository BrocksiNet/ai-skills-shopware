import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  BOT_LOGIN,
  parseComments,
  parseDraftCommand,
  proposalsComment,
  RUN_MARKER,
  runFor,
} from '../src/draft-comment.ts';

const MD = [
  '# Rule suggestions 2026-10-26',
  '',
  'Window 2026-10-19 to 2026-10-26, agent `copilot`, model `claude-haiku-4.5`.',
  '',
  '| Rank | Score | ID | Action | Rule | Skill | Title | PRs | Extensions | Overlaps | Checks |',
  '| ---- | ----- | -- | ------ | ---- | ----- | ----- | --- | ---------- | -------- | ------ |',
  '| 1 | 4 | 2026-10-26-01 | new |  | sw-security | Anchor with D | 2 | yes |  | ok |',
  '',
  '## 2026-10-26-01: new in sw-security',
  '',
  'Draft: long text that stays in the artifact',
].join('\n');

const usage = (c: ReturnType<typeof parseDraftCommand>): string => (typeof c === 'string' ? c : JSON.stringify(c));

describe('proposals comment', () => {
  test('keeps the summary and table, drops the proposal sections, marks the run', () => {
    const c = proposalsComment({ markdown: MD, runId: '42', runUrl: 'https://x/runs/42' });
    assert.ok(c.startsWith('## Rule suggestions 2026-10-26\n'));
    assert.match(c, /\| 2026-10-26-01 \| new \|/u);
    assert.doesNotMatch(c, /long text that stays/u);
    assert.match(c, /`\/draft <ID>`/u);
    assert.ok(c.endsWith(`<!-- ${RUN_MARKER}: 42 -->\n`));
  });
  test('cuts a table that would not fit a comment at a row boundary', () => {
    const row = '| 9 | 1 | 2026-10-26-99 | new |  | sw-x | t | 1 | no |  | ok |';
    const big = `${MD.split('\n## ')[0] ?? ''}\n${Array.from({ length: 2000 }, () => row).join('\n')}`;
    const c = proposalsComment({ markdown: big, runId: '1', runUrl: 'u' });
    assert.ok(c.length < 65_536);
    assert.match(c, /\|\n\nThe table is cut here/u);
  });
});

describe('/draft command', () => {
  test('an ID, optionally an agent, on the first line', () => {
    assert.deepEqual(parseDraftCommand('/draft 2026-10-26-04'), { id: '2026-10-26-04', agent: 'copilot' });
    assert.deepEqual(parseDraftCommand('/draft  2026-10-26-04 opencode\nthanks'), {
      id: '2026-10-26-04',
      agent: 'opencode',
    });
  });
  test('anything else is a usage message', () => {
    assert.match(usage(parseDraftCommand('/draft')), /^usage/u);
    assert.match(usage(parseDraftCommand('/draft 2026-10-26-04; rm -rf /')), /^usage/u);
    assert.match(usage(parseDraftCommand('/draft ../etc')), /^usage/u);
    assert.match(usage(parseDraftCommand('/draft 2026-10-26-04 claude')), /^unknown agent claude/u);
  });
});

const comment = (id: string, run: string, login = BOT_LOGIN): { body: string; login: string } => ({
  body: `| 1 | 2 | ${id} | new |\n<!-- ${RUN_MARKER}: ${run} -->`,
  login,
});

describe('finding the run of a proposal', () => {
  test('the newest bot comment that lists the ID', () => {
    const comments = [comment('2026-10-26-01', '1'), comment('2026-10-26-01', '2'), comment('2026-10-27-01', '3')];
    assert.equal(runFor('2026-10-26-01', comments), '2');
    assert.equal(runFor('2026-10-27-01', comments), '3');
    assert.equal(runFor('2026-10-28-01', comments), undefined);
  });
  test('a marker in a comment by someone else, or an ID that is not one, finds nothing', () => {
    assert.equal(runFor('2026-10-26-01', [comment('2026-10-26-01', '9', 'someone')]), undefined);
    assert.equal(runFor('.*', [comment('2026-10-26-01', '9')]), undefined);
  });
  test('comments come as JSON lines; other lines are skipped', () => {
    const text = `${JSON.stringify({ body: 'b', login: 'l' })}\nnot json\n{"body":1,"login":"x"}\n\n`;
    assert.deepEqual(parseComments(text), [{ body: 'b', login: 'l' }]);
  });
});
