// The weekly drift report (plan WP8, WP12 steps 1 and 2): the mined commits
// of every source as signals, mapped to the skills and rules they touch, as
// Markdown for a GitHub issue.
import type { Catalog } from './catalog.ts';
import { type MapIndex, mapSignals } from './map-signal.ts';
import { type Mined, type MiningStates, parseStates } from './mine-trunk.ts';
import { renderReviewSection, type ReviewWeek } from './review-report.ts';
import { commitSignals, type Signal, type SignalMap, toJsonLines } from './signals.ts';
import { compareText } from './text.ts';

const MARKER = /<!-- mine-trunk-state: (\{.*\}) -->/u;

const short = (sha: string): string => sha.slice(0, 8);
const commitLink = (repo: string, sha: string): string => `[${short(sha)}](https://github.com/${repo}/commit/${sha})`;
const code = (t: string): string => (t.includes('`') ? `\`\` ${t} \`\`` : `\`${t}\``);
const oneLine = (t: string, max = 160): string => {
  const line = t.replaceAll(/\s+/gu, ' ').trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
};

function describe(s: Signal): string {
  const verb = s.change === '-' ? 'Removed' : 'Added';
  const by = s.author === undefined ? '' : ` by @${s.author.login}`;
  switch (s.kind) {
    case 'skill-bullet':
      return `${verb} agent skill bullet in \`${s.path}\`: ${code(s.text)}`;
    case 'guideline-heading':
      return `${verb} guideline heading in \`${s.path}\`: ${code(s.text)}`;
    case 'guide-id':
      return `${verb} core guide ID ${s.text} in \`${s.path}\``;
    case 'template-line':
      return `${verb} PR template line: ${code(s.text)}`;
    case 'rule-class':
      return `Rule class \`${s.text}\` (${s.path.includes('/Danger/') ? 'danger' : 'phpstan'}) ${s.status ?? 'changed'}`;
    case 'upstream-line':
      return `${verb} line in \`${s.path}\`: ${code(s.text)}`;
    case 'review-comment':
      return `Review comment${by} on \`${s.path}\`: ${code(oneLine(s.text))}`;
    case 'review-body':
      return `Review${by}: ${code(oneLine(s.text))}`;
    case 'api-break':
      break;
  }
  return `API break in \`${s.path}\`: ${code(oneLine(s.text))}`;
}

function where(s: Signal): string {
  if (s.commit !== undefined) return `${commitLink(s.repo, s.commit.sha)}, ${s.source}`;
  if (s.pr !== undefined) return `[#${s.pr.number}](${s.url})`;
  return `[link](${s.url}), ${s.source}`;
}

const item = (s: Signal): string => `- ${describe(s)} (${where(s)})`;

/** A modified rule class only counts when a rule cites it; small fixes to
 *  other rule classes stay quiet. */
const kept = (s: Signal): boolean =>
  s.kind !== 'rule-class' || s.status !== 'modified' || s.map.some((m) => m.via === 'enforced_by');

const RULE_VIAS = new Set(['core_guide_ids', 'enforced_by', 'trunk.source', 'upstream']);

/** Group of a mapping inside its skill: one rule, one reference, or the
 *  skill alone. The prefix orders rules before references before the rest. */
function groupKey(m: SignalMap): string {
  const [rule] = m.rules;
  if (RULE_VIAS.has(m.via) && rule !== undefined) return `1 ${rule}`;
  if (m.reference !== undefined) return `2 ${m.reference}`;
  return '3';
}

interface Group {
  skill: string;
  key: string;
  maps: SignalMap[];
  signals: Signal[];
}

function groups(signals: Signal[]): Group[] {
  const byKey = new Map<string, Group>();
  for (const s of signals) {
    for (const m of s.map) {
      const key = groupKey(m);
      const id = `${m.skill}\n${key}`;
      const group = byKey.get(id) ?? { skill: m.skill, key, maps: [], signals: [] };
      group.maps.push(m);
      if (!group.signals.includes(s)) group.signals.push(s);
      byKey.set(id, group);
    }
  }
  return [...byKey.values()].toSorted((a, b) => compareText(a.skill, b.skill) || compareText(a.key, b.key));
}

function groupHeading(g: Group, catalog: Catalog): string[] {
  const vias = [...new Set(g.maps.map((m) => `\`${m.via}\``))].join(', ');
  if (g.key.startsWith('1 ')) {
    const id = g.key.slice(2);
    const title = catalog.rules.find((r) => r.id === id)?.title;
    return [`### ${id}${title === undefined ? '' : `: ${title}`}`, '', `Matched by ${vias}.`];
  }
  if (g.key.startsWith('2 ')) {
    const rules = [...new Set(g.maps.flatMap((m) => m.rules))];
    const there = rules.length === 0 ? 'No rule there yet.' : `Rules there: ${rules.join(', ')}.`;
    return [`### \`${g.key.slice(2)}\``, '', `Matched by its route. ${there}`];
  }
  return ['### No rule yet', '', "Matched by the source's skill list in `rules/sources.json`."];
}

function skillSections(signals: Signal[], catalog: Catalog): string[][] {
  const sections = new Map<string, string[]>();
  for (const g of groups(signals)) {
    const lines = sections.get(g.skill) ?? [`## ${g.skill}`];
    lines.push('', ...groupHeading(g, catalog), '', ...g.signals.map((s) => item(s)));
    sections.set(g.skill, lines);
  }
  return [...sections.values()];
}

/** A commit counts as read when it has a signal left after the noise
 *  filter, or a watched file whose diff the API left out. */
const hasDelta = (c: Mined['commits'][number], shas: Set<string>): boolean =>
  shas.has(c.commit.sha) || c.deltas.truncated.length > 0;

function unmappedSection(signals: Signal[]): string[] {
  const unmapped = signals.filter((s) => s.map.length === 0);
  return [
    '## Unmapped',
    '',
    ...(unmapped.length === 0
      ? ['None.']
      : [
          'No rule, route or source skill covers these. They are the backlog for new rules.',
          '',
          ...unmapped.map((s) => item(s)),
        ]),
  ];
}

function sourceTable(mined: Mined[], deltas: Map<Mined, number>): string[] {
  return [
    '| Source | Since | Commits | With a delta | Up to |',
    '| ------ | ----- | ------- | ------------ | ----- |',
    ...mined.map((m) =>
      m.first === true
        ? `| \`${m.source.id}\` | | first pass | | ${commitLink(m.source.repo, m.head.sha)} |`
        : `| \`${m.source.id}\` | ${m.window.from.slice(0, 10)} | ${m.commits.length} | ${deltas.get(m) ?? 0} | ` +
          `${commitLink(m.source.repo, m.head.sha)} |`,
    ),
  ];
}

function commitsSection(mined: Mined[], keptBySha: Set<string>): string[] {
  const perSource = mined.flatMap((m) => {
    if (m.first === true) {
      return [
        '',
        `### ${m.source.id}`,
        '',
        `First pass: the next report starts after ${commitLink(m.source.repo, m.head.sha)}.`,
      ];
    }
    const read = m.commits.filter((c) => hasDelta(c, keptBySha));
    const quiet = m.commits.filter((c) => !hasDelta(c, keptBySha));
    const truncated = m.commits.flatMap((c) =>
      c.deltas.truncated.map(
        (f) => `- Diff too large for the API, read it on GitHub: \`${f}\` (${commitLink(m.source.repo, c.commit.sha)})`,
      ),
    );
    return [
      '',
      `### ${m.source.id}`,
      '',
      ...(read.length === 0
        ? ['No commit with a delta.']
        : read.map(
            (c) => `- ${commitLink(m.source.repo, c.commit.sha)} ${c.commit.title} (${c.commit.date.slice(0, 10)})`,
          )),
      ...(truncated.length === 0 ? [] : ['', ...truncated]),
      ...(quiet.length === 0
        ? []
        : ['', `Without a delta: ${quiet.map((c) => commitLink(m.source.repo, c.commit.sha)).join(', ')}.`]),
    ];
  });
  return ['## Commits', ...perSource];
}

/** The mapped signals of every mined source, noise left out. */
export function reportSignals(mined: Mined[], index: MapIndex): Signal[] {
  const raw = mined.flatMap((m) => m.commits.flatMap((c) => commitSignals(m.source, c)));
  return mapSignals(raw, index).filter((s) => kept(s));
}

/** The mapped signals as JSON Lines, for `--signals`. */
export const reportJsonLines = (mined: Mined[], index: MapIndex): string => toJsonLines(reportSignals(mined, index));

/** The issue body. It ends with the states a `/mined` comment moves to.
 *  `reviews`, when given, adds the week's review comments. */
export function renderReport(mined: Mined[], catalog: Catalog, index: MapIndex, reviews?: ReviewWeek): string {
  const signals = reportSignals(mined, index);
  const keptBySha = new Set(signals.flatMap((s) => (s.commit === undefined ? [] : [s.commit.sha])));
  const deltas = new Map(mined.map((m) => [m, m.commits.filter((c) => hasDelta(c, keptBySha)).length]));
  const next: MiningStates = Object.fromEntries(
    mined.map((m) => [m.source.id, { last_sha: m.head.sha, last_date: m.head.date }]),
  );
  const to =
    mined
      .map((m) => m.window.to.slice(0, 10))
      .toSorted(compareText)
      .at(-1) ?? '';
  const sections = [
    [
      `# Drift up to ${to}`,
      '',
      `${signals.length} change(s) from ${mined.length} source(s), grouped by the skill and rule they touch.`,
      '',
      ...sourceTable(mined, deltas),
    ],
    ...skillSections(signals, catalog),
    unmappedSection(signals),
    ...(reviews === undefined ? [] : [renderReviewSection(reviews)].filter((r) => r.length > 0)),
    commitsSection(mined, keptBySha),
    [
      'Comment `/mined` once every change is mapped, ticketed or dismissed. That opens a PR that moves ' +
        '`docs/.mining-state.json` to the commits in the table above.',
      '',
      `<!-- mine-trunk-state: ${JSON.stringify(next)} -->`,
    ],
  ];
  return `${sections.map((s) => s.join('\n')).join('\n\n')}\n`;
}

/** The states recorded at the end of a report. A report from before WP12
 *  records only shopware/shopware trunk. */
export function stateFromReport(body: string): MiningStates {
  const json = MARKER.exec(body)?.[1];
  if (json === undefined) throw new Error('no mine-trunk-state marker in the report');
  return parseStates(JSON.parse(json));
}
