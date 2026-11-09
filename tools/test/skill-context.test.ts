import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeTranscript, classifyPath, ownershipTest, parseJsonl, skillTokens } from '../src/skill-context.ts';

const isOurs = ownershipTest(
  new Set(['sw-testing', 'sw-skill-router']),
  new Set(['shopware-testing', 'shopware-admin-js']),
  {
    resolve: (p) => p,
    repoMarker: 'ai-skills-shopware',
    coreSkills: new Set(['shopware-admin-js']),
  },
);

const request = (id: string, input: number): Record<string, unknown> => ({
  type: 'assistant',
  message: {
    id,
    usage: { input_tokens: 0, cache_read_input_tokens: input, cache_creation_input_tokens: 0 },
    content: [],
  },
});

test('classifyPath tells references, skill files and the router apart', () => {
  assert.deepEqual(classifyPath('/p/.claude/skills/sw-testing/references/unit.md'), {
    skill: 'sw-testing',
    kind: 'reference',
  });
  assert.deepEqual(classifyPath('/p/.claude/skills/sw-testing/SKILL.md'), { skill: 'sw-testing', kind: 'skill-file' });
  assert.deepEqual(classifyPath('node /p/skills/sw-skill-router/scripts/route.mjs --task build'), {
    skill: 'sw-skill-router',
    kind: 'router',
  });
  assert.equal(classifyPath('/p/src/Core/Kernel.php'), null);
});

test('ownership: a core skill with our old name is not ours unless it resolves into the library', () => {
  assert.equal(isOurs('sw-testing'), true);
  assert.equal(isOurs('shopware-testing'), true);
  assert.equal(isOurs('shopware-admin-js'), false);
  assert.equal(isOurs('shopware-admin-js', '/x/ai-skills-shopware-v0.15.0/skills/shopware-admin-js'), true);
  assert.equal(isOurs('shopware-testing', '/trunk/.agents/skills/shopware-testing'), false);
  assert.equal(isOurs('cloudflare'), false);
});

test('a load is carried by every later request until the compaction', () => {
  const body = `Base directory for this skill: /p/.claude/skills/sw-testing\n${'x'.repeat(3940)}`;
  const lines = [
    {
      type: 'attachment',
      attachment: { type: 'skill_listing', content: `- sw-testing: ${'a'.repeat(386)}\n- other: ${'b'.repeat(391)}` },
    },
    request('r1', 1000),
    { type: 'user', message: { content: [{ type: 'text', text: body }] } },
    request('r2', 2000),
    request('r2', 2000),
    {
      type: 'assistant',
      message: {
        id: 'r3',
        usage: { input_tokens: 10, cache_read_input_tokens: 3000 },
        content: [
          {
            type: 'tool_use',
            id: 't1',
            name: 'Read',
            input: { file_path: '/p/.claude/skills/sw-testing/references/unit.md' },
          },
        ],
      },
    },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: 'y'.repeat(398) }] } },
    request('r4', 4000),
    { type: 'system', subtype: 'compact_boundary' },
    request('r5', 500),
  ];
  const report = analyzeTranscript(lines, isOurs);
  assert.equal(report.requests, 5);
  assert.equal(report.inputTokens, 10510);
  assert.equal(report.peakTokens, 4000);
  assert.equal(report.listingTokens, 100);
  assert.deepEqual(
    report.loads.map((l) => [l.kind, l.skill, l.tokens, l.requests]),
    [
      ['skill', 'sw-testing', 1000, 3],
      ['reference', 'sw-testing', 100, 1],
    ],
  );
  assert.deepEqual(skillTokens(report), { listing: 500, loads: 3100 });
});

test('parseJsonl skips a truncated last line', () => {
  assert.deepEqual(parseJsonl('{"a":1}\n{"b":'), [{ a: 1 }]);
});
