// The weekly trunk drift report (plan WP8): mined commits checked against
// rules/catalog.json, as Markdown for a GitHub issue.
import type { Catalog } from './catalog.ts';
import { type Mined, type MinedCommit, type MiningState, parseState, TRUNK } from './mine-trunk.ts';
import type { ClassDelta, CommitDeltas, LineDelta } from './trunk-deltas.ts';

const MARKER = /<!-- mine-trunk-state: (\{[^}]*\}) -->/u;

const short = (sha: string): string => sha.slice(0, 8);
const link = (sha: string): string => `[${short(sha)}](https://github.com/${TRUNK}/commit/${sha})`;
const code = (t: string): string => (t.includes('`') ? `\`\` ${t} \`\`` : `\`${t}\``);

interface Cited {
  /** Core guide ID -> our rule IDs that cite it. */
  guideIds: Map<string, string[]>;
  /** Enforcement tool -> our rule IDs that list it in `enforced_by`. */
  tools: Map<string, string[]>;
}

const add = (map: Map<string, string[]>, key: string, id: string): void => {
  map.set(key, [...(map.get(key) ?? []), id]);
};

function cited(catalog: Catalog): Cited {
  const guideIds = new Map<string, string[]>();
  const tools = new Map<string, string[]>();
  for (const rule of catalog.rules) {
    for (const g of rule.core_guide_ids) add(guideIds, g, rule.id);
    for (const e of rule.trunk?.enforced_by ?? []) add(tools, e.tool, rule.id);
  }
  return { guideIds, tools };
}

/** A commit is worth reading when it changes text or adds or removes a rule
 *  class, or changes a rule class the catalog cites. */
function hasDelta(d: CommitDeltas, c: Cited): boolean {
  const lines = d.bullets.length + d.headings.length + d.guideIds.length + d.template.length + d.truncated.length;
  return lines > 0 || d.classes.some((k) => k.status !== 'modified' || c.tools.has(k.name));
}

interface Found<T> {
  sha: string;
  item: T;
}

const gather = <T>(commits: MinedCommit[], pick: (d: CommitDeltas) => T[]): Found<T>[] =>
  commits.flatMap((m) => pick(m.deltas).map((item) => ({ sha: m.commit.sha, item })));

function guideSection(commits: MinedCommit[], c: Cited): string[] {
  const ids = gather(commits, (d) => d.guideIds);
  const unmapped = ids.filter((f) => f.item.change === '+' && !c.guideIds.has(f.item.text));
  const retired = ids.filter((f) => f.item.change === '-' && c.guideIds.has(f.item.text));
  return [
    '## Unmapped core guide IDs',
    '',
    ...(unmapped.length === 0
      ? ['None.']
      : unmapped.map((f) => `- ${f.item.text} in \`${f.item.file}\` (${link(f.sha)})`)),
    ...retired.map(
      (f) =>
        `- Retired, still cited by ${(c.guideIds.get(f.item.text) ?? []).join(', ')}: ${f.item.text} (${link(f.sha)})`,
    ),
  ];
}

function enforcementRow(f: Found<ClassDelta>, c: Cited): string {
  const rules = c.tools.get(f.item.name);
  const catalog = rules === undefined ? '**unmapped**' : rules.join(', ');
  return `| \`${f.item.name}\` | ${f.item.kind} | ${f.item.status} | ${link(f.sha)} | ${catalog} |`;
}

function enforcementSection(commits: MinedCommit[], c: Cited): string[] {
  const rows = gather(commits, (d) => d.classes).filter(
    (f) => f.item.status !== 'modified' || c.tools.has(f.item.name),
  );
  if (rows.length === 0) return ['## New enforcement', '', 'None.'];
  return [
    '## New enforcement',
    '',
    'Rule classes added, removed or renamed, and changes to classes the catalog cites in `enforced_by`.',
    '',
    '| Class | Kind | Change | Commit | Catalog |',
    '| ----- | ---- | ------ | ------ | ------- |',
    ...rows.map((f) => enforcementRow(f, c)),
  ];
}

function linesSection(title: string, found: Found<LineDelta>[], empty: string): string[] {
  if (found.length === 0) return [title, '', empty];
  const files = [...new Set(found.map((f) => f.item.file))];
  return [
    title,
    ...files.flatMap((file) =>
      ['', `\`${file}\``, ''].concat(
        found
          .filter((f) => f.item.file === file)
          .map((f) => `- ${f.item.change === '+' ? 'Added' : 'Removed'}: ${code(f.item.text)} (${link(f.sha)})`),
      ),
    ),
  ];
}

function commitsSection(mined: Mined, c: Cited): string[] {
  const read = mined.commits.filter((m) => hasDelta(m.deltas, c));
  const quiet = mined.commits.filter((m) => !hasDelta(m.deltas, c));
  const truncated = mined.commits.flatMap((m) =>
    m.deltas.truncated.map((f) => `- Diff too large for the API, read it on GitHub: \`${f}\` (${link(m.commit.sha)})`),
  );
  return [
    '## Commits',
    '',
    ...(read.length === 0
      ? ['No commit with a delta.']
      : read.map((m) => `- ${link(m.commit.sha)} ${m.commit.title} (${m.commit.date.slice(0, 10)})`)),
    ...(truncated.length === 0 ? [] : ['', ...truncated]),
    ...(quiet.length === 0 ? [] : ['', `Without a delta: ${quiet.map((m) => link(m.commit.sha)).join(', ')}.`]),
  ];
}

/** The issue body. It ends with the state a `/mined` comment moves to. */
export function renderReport(mined: Mined, catalog: Catalog): string {
  const c = cited(catalog);
  const next: MiningState = { last_sha: mined.head.sha, last_date: mined.head.date };
  const all = mined.commits;
  const sections = [
    [
      `# Trunk drift ${mined.window.from.slice(0, 10)} to ${mined.window.to.slice(0, 10)}`,
      '',
      `${all.length} commit(s) on \`${TRUNK}\` trunk touched the watched paths, up to ${link(mined.head.sha)}. ` +
        `${all.filter((m) => hasDelta(m.deltas, c)).length} of them have a delta.`,
    ],
    guideSection(all, c),
    enforcementSection(all, c),
    linesSection(
      '## Changed guideline headings',
      gather(all, (d) => d.headings),
      'None.',
    ),
    linesSection(
      '## Agent skill bullets',
      gather(all, (d) => d.bullets),
      'None.',
    ),
    linesSection(
      '## PR template',
      gather(all, (d) => d.template),
      'Unchanged.',
    ),
    commitsSection(mined, c),
    [
      'Comment `/mined` once every delta is mapped, ticketed or dismissed. That opens a PR that moves ' +
        '`docs/.mining-state.json` to the commit above.',
      '',
      `<!-- mine-trunk-state: ${JSON.stringify(next)} -->`,
    ],
  ];
  return `${sections.map((s) => s.join('\n')).join('\n\n')}\n`;
}

/** The state recorded at the end of a report. */
export function stateFromReport(body: string): MiningState {
  const json = MARKER.exec(body)?.[1];
  if (json === undefined) throw new Error('no mine-trunk-state marker in the report');
  return parseState(JSON.parse(json));
}
