// What one commit changes that a skill author has to look at. On
// shopware/shopware trunk (plan WP8): agent skill bullets, coding guideline
// headings, review guide rule IDs, the PR template and the PHPStan and Danger
// rule classes. In an upstream skill repository (plan WP12): the bullets and
// headings of every Markdown file.
import type { Extractor } from './sources.ts';

/** A file of a commit, as the GitHub API returns it. `patch` is missing for
 *  binary files and for diffs that are too large to show. */
export interface TrunkFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

export interface TrunkCommit {
  sha: string;
  /** First line of the commit message. */
  title: string;
  /** Committer date, ISO 8601. */
  date: string;
  files: TrunkFile[];
}

export type Change = '+' | '-';

export interface LineDelta {
  file: string;
  change: Change;
  text: string;
}

export interface ClassDelta {
  file: string;
  /** Class name, from the file name. */
  name: string;
  kind: 'phpstan' | 'danger';
  /** GitHub file status: added, removed, modified, renamed. */
  status: string;
}

export interface CommitDeltas {
  /** Bullets added to or removed from `.agents/skills/<skill>/SKILL.md` or a
   *  review persona, or from any Markdown file of an upstream source. */
  bullets: LineDelta[];
  /** Headings added to or removed from `coding-guidelines/**`, or from any
   *  Markdown file of an upstream source. */
  headings: LineDelta[];
  /** Rule IDs added to or removed from review guide frontmatter. */
  guideIds: LineDelta[];
  /** Lines of `.github/PULL_REQUEST_TEMPLATE.md`. */
  template: LineDelta[];
  classes: ClassDelta[];
  /** Watched markdown files whose patch GitHub left out. */
  truncated: string[];
}

/** A core agent skill, and the review personas whose bullets are review rules. */
const SKILL_FILE = /^\.agents\/skills\/(?:[^/]+\/SKILL|sw-review\/personas\/[^/]+)\.md$/u;
const GUIDE_FILE = /^\.agents\/skills\/sw-review\/guides\/[^/]+\.md$/u;
const GUIDELINE_FILE = /^coding-guidelines\/.+\.md$/u;
const TEMPLATE_FILE = '.github/PULL_REQUEST_TEMPLATE.md';
const RULE_CLASS = /^src\/Core\/DevOps\/StaticAnalyze\/(PHPStan|Danger)\/Rules\/(?:.+\/)?([A-Za-z0-9_]+)\.php$/u;
/** Classes next to the rules that are no rule: shared helpers, the patterns
 *  a rule reads, traits, test fixtures. Trunk names them by their role. */
const NOT_A_RULE = /(?:Helper|Pattern|Trait|Interface|Map|Markers|Collector|Resolver|Detector|Errors)$|\/Fixtures?\//u;

const BULLET = /^\s*(?:[-*]|\d+\.)\s+(.+)$/u;
const HEADING = /^(#{1,6}\s+.+)$/u;
const GUIDE_ID = /^\s*-\s*\{\s*id:\s*([A-Z]+-[0-9]{3})\b/u;
const TEXT = /^(.*\S.*)$/u;

const FENCE = /^\s{0,3}(?:```|~~~)\s*(\S*)/u;
const HUNK = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/u;

type Side = '-' | '+';
const sidesOf = (line: string): Side[] => {
  if (line.startsWith('-')) return ['-'];
  if (line.startsWith('+')) return ['+'];
  return ['-', '+'];
};
const onSide =
  (side: Side) =>
  (line: string): boolean =>
    sidesOf(line).includes(side);

/** Whether the hunk starts inside a fenced code block. The text before a
 *  hunk is the same on both sides, so either side can tell: a fence with
 *  an info string (```php) always opens a block, and an odd number of bare
 *  fences before it means the first one closed a block the hunk started in.
 *  Without such a fence, the hunk is taken to start outside. */
function startsInFence(hunk: string[]): boolean {
  for (const side of ['+', '-'] as const) {
    const fences = hunk
      .filter(onSide(side))
      .map((l) => FENCE.exec(l.slice(1)))
      .filter((m) => m !== null);
    const opening = fences.findIndex((m) => (m[1] ?? '') !== '');
    if (opening !== -1) return opening % 2 === 1;
  }
  return false;
}

interface SideState {
  fence: boolean;
  /** In the YAML frontmatter, and whether its opening `---` was seen. */
  front: boolean;
  opened: boolean;
}

/** A hunk at line 1 whose first line is `---` starts in the frontmatter. */
const frontAt = (start: string | undefined, hunk: string[], side: Side): boolean =>
  start === '1' && hunk.find(onSide(side))?.slice(1).trim() === '---';

function step(state: SideState, text: string, isFence: boolean): void {
  if (state.front) {
    if (text.trim() !== '---') return;
    if (state.opened) state.front = false;
    state.opened = true;
  } else if (isFence) state.fence = !state.fence;
}

/** For every line of a patch, whether it is Markdown prose: not a hunk
 *  header, not in a fenced code block and not in the YAML frontmatter of
 *  the file. A `# comment` in a shell block is no heading, a YAML list item
 *  no bullet. Each side of the diff is followed on its own. */
export function proseLines(patch: string): boolean[] {
  // Hunks: a header and its lines. Lines before the first header (a patch
  // without one) form a hunk of their own at an unknown line.
  const hunks: { header: RegExpExecArray | null; lines: string[] }[] = [{ header: null, lines: [] }];
  for (const line of patch.split('\n')) {
    const header = HUNK.exec(line);
    if (header === null) hunks.at(-1)?.lines.push(line);
    else hunks.push({ header, lines: [] });
  }
  return hunks.flatMap(({ header, lines }, i) => {
    const fence = startsInFence(lines);
    const state: Record<Side, SideState> = {
      '-': { fence, front: frontAt(header?.[1], lines, '-'), opened: false },
      '+': { fence, front: frontAt(header?.[2], lines, '+'), opened: false },
    };
    const prose = lines.map((line) => {
      const text = line.slice(1);
      const isFence = FENCE.test(text);
      const sides = sidesOf(line);
      const own = state[sides[0] ?? '+'];
      const isProse = !own.fence && !own.front && !isFence;
      for (const side of sides) step(state[side], text, isFence);
      return isProse;
    });
    // The hunk header is no prose line.
    if (i > 0) prose.unshift(false);
    return prose;
  });
}

/** The added and removed lines of a patch whose text matches `pattern`
 *  (first group). A line removed and added again unchanged, as when lines
 *  move, cancels out. With `markdown`, only prose lines count, see
 *  `proseLines`. */
export function changedLines(file: string, patch: string, pattern: RegExp, markdown = false): LineDelta[] {
  const lines: LineDelta[] = [];
  const prose = markdown ? proseLines(patch) : [];
  for (const [i, line] of patch.split('\n').entries()) {
    const change = line[0];
    const match = pattern.exec(line.slice(1));
    if ((change === '+' || change === '-') && match?.[1] !== undefined && (!markdown || prose[i] === true)) {
      lines.push({ file, change, text: match[1].trim() });
    }
  }
  const key = (l: LineDelta): string => `${l.change}${l.text}`;
  const keys = new Set(lines.map((l) => key(l)));
  return lines.filter((l) => !keys.has(`${l.change === '+' ? '-' : '+'}${l.text}`));
}

export function ruleClass(file: TrunkFile): ClassDelta | undefined {
  if (NOT_A_RULE.test(file.filename.replace(/\.php$/u, ''))) return undefined;
  const match = RULE_CLASS.exec(file.filename);
  const [, tool, name] = match ?? [];
  if (tool === undefined || name === undefined) return undefined;
  return { file: file.filename, name, kind: tool === 'Danger' ? 'danger' : 'phpstan', status: file.status };
}

/** A file under one of the watched paths; every file without paths. */
const under = (name: string, paths: string[] | undefined): boolean =>
  paths === undefined || paths.some((p) => name === p || name.startsWith(`${p.replace(/\/$/u, '')}/`));

/** A change log restates the commit; its bullets are release notes, not
 *  guidance. */
const CHANGE_LOG = /(?:^|\/)CHANGE(?:LOG|S)\.md$/iu;

/** Bullets and headings of the Markdown files of an upstream commit under
 *  the watched paths, change logs left out: the repository's README or
 *  release notes are not what the source is watched for. */
function markdownDeltas(commit: TrunkCommit, paths: string[] | undefined): CommitDeltas {
  const deltas: CommitDeltas = { bullets: [], headings: [], guideIds: [], template: [], classes: [], truncated: [] };
  const read = (name: string): boolean => name.endsWith('.md') && under(name, paths) && !CHANGE_LOG.test(name);
  for (const file of commit.files.filter((f) => read(f.filename))) {
    if (file.patch === undefined) {
      deltas.truncated.push(file.filename);
      continue;
    }
    deltas.bullets.push(...changedLines(file.filename, file.patch, BULLET, true));
    deltas.headings.push(...changedLines(file.filename, file.patch, HEADING, true));
  }
  return deltas;
}

/** The deltas of one commit. `paths`, the source's watched paths, limits
 *  the Markdown extractor to the files under them. */
export function commitDeltas(
  commit: TrunkCommit,
  extractor: Extractor = 'shopware-trunk',
  paths?: string[],
): CommitDeltas {
  if (extractor === 'markdown') return markdownDeltas(commit, paths);
  const deltas: CommitDeltas = { bullets: [], headings: [], guideIds: [], template: [], classes: [], truncated: [] };
  for (const file of commit.files) {
    const cls = ruleClass(file);
    if (cls !== undefined) deltas.classes.push(cls);
    const name = file.filename;
    const target = SKILL_FILE.test(name)
      ? { list: deltas.bullets, pattern: BULLET, markdown: true }
      : GUIDE_FILE.test(name)
        ? { list: deltas.guideIds, pattern: GUIDE_ID, markdown: false }
        : GUIDELINE_FILE.test(name)
          ? { list: deltas.headings, pattern: HEADING, markdown: true }
          : name === TEMPLATE_FILE
            ? { list: deltas.template, pattern: TEXT, markdown: false }
            : undefined;
    if (target === undefined) continue;
    if (file.patch === undefined) deltas.truncated.push(name);
    else target.list.push(...changedLines(name, file.patch, target.pattern, target.markdown));
  }
  return deltas;
}
