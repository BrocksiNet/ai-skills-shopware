// `suggestions/<date>.md`: the proposals of a `suggest-rules` run for a
// person to judge. Local and git-ignored; it may quote private evidence.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Suggestion } from './suggest-ask.ts';
import { inRankOrder } from './suggest-rank.ts';
import type { ClusterSummary, SuggestResult } from './suggest-run.ts';

const cell = (t: string): string => t.replaceAll('|', '\\|').replaceAll(/\s+/gu, ' ').trim();
const link = (u: string): string => (u.startsWith('https://') ? `<${u}>` : `\`${u}\``);

function rankLine(s: Suggestion): string[] {
  const r = s.rank;
  if (r === undefined) return [];
  if (r.unranked !== undefined) return [`Not ranked: ${r.unranked}.`, ''];
  return [
    `Rank ${String(r.position)}, score ${String(r.score)}: ${String(r.prs)} PR(s), ${String(r.changes_requested)} with changes requested, ${r.extensions ? 'for extension developers' : 'core only'}${r.overlaps === undefined ? '' : `, overlaps ${r.overlaps}`}.`,
    '',
  ];
}

const rankCell = (s: Suggestion): string => {
  const r = s.rank;
  if (r === undefined || r.position === 0) return '-';
  return String(r.position);
};

function proposal(s: Suggestion): string[] {
  const failed = s.checks.filter((c) => !c.ok);
  return [
    `## ${s.id}: ${s.action}${s.rule === '' ? '' : ` ${s.rule}`} in ${s.skill}`,
    '',
    `**${cell(s.title)}**`,
    '',
    ...rankLine(s),
    `Cluster \`${s.cluster}\`. Checks: ${failed.length === 0 ? 'all passed' : `**failed**: ${failed.map((c) => `${c.name} (${c.detail})`).join('; ')}`}.${s.private ? ' Evidence from a private source: cite no link in public text.' : ''}`,
    '',
    ...(s.reason === undefined || s.reason === '' ? [] : [`Reason: ${s.reason}`, '']),
    ...(s.draft === '' ? [] : ['Draft:', '', `> ${s.draft.replaceAll(/\n+/gu, ' ')}`, '']),
    '| Criterion | Answer |',
    '| --------- | ------ |',
    ...Object.entries(s.criteria).map(([k, v]) => `| ${k} | ${cell(v)} |`),
    '',
    ...(s.eval === undefined
      ? []
      : [`Eval (${s.eval.kind}): catch: ${cell(s.eval.catch)}; ignore: ${cell(s.eval.ignore)}`, '']),
    'Evidence:',
    '',
    ...s.evidence.map((u) => `- ${link(u)}`),
    '',
    `Draft it: \`node tools/bin/suggest-rules.ts draft ${s.id}\``,
  ];
}

const clusterRow = (c: ClusterSummary): string =>
  `| \`${c.key}\` | ${String(c.signals)} | ${String(c.prs)} | ${String(c.score)} | ${c.rules.join(', ')} |`;

export function renderSuggestions(r: SuggestResult): string {
  const n = r.counts;
  const lines = [
    `# Rule suggestions ${r.generated.slice(0, 10)}`,
    '',
    `Window ${r.window.since} to ${r.window.until}, agent \`${r.agent}\`, model \`${r.model}\`.`,
    '',
    ...r.inputs.map((i) => `- Input: ${i}`),
    '',
    '| Signals | Mapped | Clusters | Dropped (single) | Agent calls | Over the cap | Agent errors | Proposals | Passed checks |',
    '| ------- | ------ | -------- | ---------------- | ----------- | ------------ | ------------ | --------- | ------------- |',
    `| ${[n.signals, n.mapped, n.clusters, n.dropped_single, n.asked, n.over_cap, n.agent_errors, n.proposals, n.passed].map(String).join(' | ')} |`,
    '',
    'Ranked by evidence per PR (reviewer trust, outdated threads, requested changes), halved for a core-only',
    'rule and again for an overlap with a higher proposal. Draft from the top.',
    '',
    '| Rank | Score | ID | Action | Rule | Skill | Title | PRs | Extensions | Overlaps | Checks |',
    '| ---- | ----- | -- | ------ | ---- | ----- | ----- | --- | ---------- | -------- | ------ |',
    ...inRankOrder(r.suggestions).map(
      (s) =>
        `| ${rankCell(s)} | ${String(s.rank?.score ?? '-')} | ${s.id} | ${s.action} | ${s.rule} | ${s.skill} | ${cell(s.title)} | ${String(s.rank?.prs ?? '-')} | ${s.rank?.extensions === true ? 'yes' : 'no'} | ${s.rank?.overlaps ?? ''} | ${s.ok ? 'ok' : 'failed'} |`,
    ),
  ];
  for (const s of inRankOrder(r.suggestions)) lines.push('', ...proposal(s));
  const retire =
    r.retirements.length === 0
      ? ['None.']
      : [
          '| Rule | Skill | Kind | Evidence |',
          '| ---- | ----- | ---- | -------- |',
          ...r.retirements.map((c) => `| ${c.rule} | ${c.skill} | ${c.kind} | ${cell(c.evidence)} |`),
        ];
  lines.push('', '## Retirement evidence', '', ...retire);
  const table = ['| Cluster | Signals | PRs | Score | Rules |', '| ------- | ------- | --- | ----- | ----- |'];
  lines.push('', '## Clusters asked', '', ...table, ...r.asked.map((c) => clusterRow(c)));
  if (r.skipped.length > 0)
    lines.push(
      '',
      '## Over the cap',
      '',
      'Raise `SUGGEST_MAX_CLUSTERS` to ask about these.',
      '',
      ...table,
      ...r.skipped.map((c) => clusterRow(c)),
    );
  if (r.errors.length > 0) lines.push('', '## Notes', '', ...r.errors.map((e) => `- ${e}`));
  return `${lines.join('\n')}\n`;
}

/** Writes `<date>.json` and `<date>.md` into `dir`; returns their paths. */
export function writeSuggestions(dir: string, result: SuggestResult): string[] {
  mkdirSync(dir, { recursive: true });
  const day = result.generated.slice(0, 10);
  const json = join(dir, `${day}.json`);
  const md = join(dir, `${day}.md`);
  writeFileSync(json, `${JSON.stringify(result, null, 2)}\n`);
  writeFileSync(md, renderSuggestions(result));
  return [md, json];
}
