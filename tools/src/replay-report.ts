// The Markdown report of a route replay (route-replay.ts).
import type { ReplayResult } from './route-replay.ts';

const pct = (v: number): string => `${(v * 100).toFixed(1)}%`;
const fixed = (v: number): string => v.toFixed(2);
const prLink = (repo: string, n: number): string => `[#${n}](https://github.com/${repo}/pull/${n})`;

function summaryTable(r: ReplayResult): string[] {
  return [
    '| Measure | Value |',
    '| ------- | ----- |',
    `| PRs replayed | ${r.cases.length} |`,
    `| PRs with a comment-mapped reference | ${r.withExpected} |`,
    `| Comment-mapped (PR, reference) pairs | ${r.expected} |`,
    `| Of those, selected by the router (recall) | ${r.hits} (${pct(r.recall)}) |`,
    `| Mean recall per PR | ${pct(r.meanRecall)} |`,
    `| References selected per PR | ${fixed(r.meanSelected)} |`,
    `| Of those, with no comment mapped (noise) | ${fixed(r.meanUnmatched)} |`,
    `| Hand labels selected | ${r.labelHits} of ${r.labels} |`,
    '',
  ];
}

function focusSection(r: ReplayResult): string[] {
  const f = r.focus;
  if (f === undefined) return [];
  return [
    `## Focus: \`${f.reference}\``,
    '',
    `- PRs that touch test code: ${f.testPrs}; the route selects it on ${f.selectedOnTests} of them.`,
    `- Selected on ${f.selected} PR(s) in all, with a comment mapped to it on ${f.expected}; recall ${f.hits} of ${f.expected}.`,
    '',
  ];
}

function labelSection(r: ReplayResult, repo: string): string[] {
  const rows = r.cases.flatMap((c) => [
    ...c.labelHits.map((l) => ({ c, l, hit: 'yes' })),
    ...c.labelMisses.map((l) => ({ c, l, hit: '**no**' })),
  ]);
  if (rows.length === 0) return [];
  return [
    '## Hand-labelled comments',
    '',
    '| PR | Rule | Reference | Selected |',
    '| -- | ---- | --------- | -------- |',
    ...rows.map(({ c, l, hit }) => `| ${prLink(repo, c.pr)} | ${l.rule ?? ''} | \`${l.reference}\` | ${hit} |`),
    '',
  ];
}

function referenceSection(r: ReplayResult): string[] {
  return [
    '## Per reference',
    '',
    '| Reference | Selected | Comment-mapped | Hits | Misses | Selected with no comment |',
    '| --------- | -------- | -------------- | ---- | ------ | ------------------------ |',
    ...r.refs.map(
      (s) => `| \`${s.reference}\` | ${s.selected} | ${s.expected} | ${s.hits} | ${s.misses} | ${s.unmatched} |`,
    ),
    '',
  ];
}

function missSection(r: ReplayResult, repo: string): string[] {
  const misses = r.cases.flatMap((c) => c.misses.map((m) => ({ c, m })));
  if (misses.length === 0) return [];
  return [
    '## Misses',
    '',
    '| PR | Reference | Comments |',
    '| -- | --------- | -------- |',
    ...misses.map(({ c, m }) => {
      const urls = (c.comments[m] ?? []).map((u, i) => `[${i + 1}](${u})`).join(' ');
      return `| ${prLink(repo, c.pr)} | \`${m}\` | ${urls} |`;
    }),
    '',
  ];
}

export function renderReport(r: ReplayResult, repo: string, heading: string): string {
  return [
    `# ${heading}`,
    '',
    ...summaryTable(r),
    ...focusSection(r),
    ...labelSection(r, repo),
    ...referenceSection(r),
    ...missSection(r, repo),
  ].join('\n');
}
