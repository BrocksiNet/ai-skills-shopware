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
  /** Bullets added to or removed from `.agents/skills/<skill>/SKILL.md`, or
   *  from any Markdown file of an upstream source. */
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

const SKILL_FILE = /^\.agents\/skills\/[^/]+\/SKILL\.md$/u;
const GUIDE_FILE = /^\.agents\/skills\/sw-review\/guides\/[^/]+\.md$/u;
const GUIDELINE_FILE = /^coding-guidelines\/.+\.md$/u;
const TEMPLATE_FILE = '.github/PULL_REQUEST_TEMPLATE.md';
const RULE_CLASS = /^src\/Core\/DevOps\/StaticAnalyze\/(PHPStan|Danger)\/Rules\/(?:.+\/)?([A-Za-z0-9_]+)\.php$/u;

const BULLET = /^\s*(?:[-*]|\d+\.)\s+(.+)$/u;
const HEADING = /^(#{1,6}\s+.+)$/u;
const GUIDE_ID = /^\s*-\s*\{\s*id:\s*([A-Z]+-[0-9]{3})\b/u;
const TEXT = /^(.*\S.*)$/u;

/** The added and removed lines of a patch whose text matches `pattern`
 *  (first group). A line removed and added again unchanged, as when lines
 *  move, cancels out. */
export function changedLines(file: string, patch: string, pattern: RegExp): LineDelta[] {
  const lines: LineDelta[] = [];
  for (const line of patch.split('\n')) {
    const change = line[0];
    const match = pattern.exec(line.slice(1));
    if ((change === '+' || change === '-') && match?.[1] !== undefined) {
      lines.push({ file, change, text: match[1].trim() });
    }
  }
  const key = (l: LineDelta): string => `${l.change}${l.text}`;
  const keys = new Set(lines.map((l) => key(l)));
  return lines.filter((l) => !keys.has(`${l.change === '+' ? '-' : '+'}${l.text}`));
}

export function ruleClass(file: TrunkFile): ClassDelta | undefined {
  const match = RULE_CLASS.exec(file.filename);
  const [, tool, name] = match ?? [];
  if (tool === undefined || name === undefined) return undefined;
  return { file: file.filename, name, kind: tool === 'Danger' ? 'danger' : 'phpstan', status: file.status };
}

/** Bullets and headings of the Markdown files of an upstream commit. */
function markdownDeltas(commit: TrunkCommit): CommitDeltas {
  const deltas: CommitDeltas = { bullets: [], headings: [], guideIds: [], template: [], classes: [], truncated: [] };
  for (const file of commit.files.filter((f) => f.filename.endsWith('.md'))) {
    if (file.patch === undefined) {
      deltas.truncated.push(file.filename);
      continue;
    }
    deltas.bullets.push(...changedLines(file.filename, file.patch, BULLET));
    deltas.headings.push(...changedLines(file.filename, file.patch, HEADING));
  }
  return deltas;
}

export function commitDeltas(commit: TrunkCommit, extractor: Extractor = 'shopware-trunk'): CommitDeltas {
  if (extractor === 'markdown') return markdownDeltas(commit);
  const deltas: CommitDeltas = { bullets: [], headings: [], guideIds: [], template: [], classes: [], truncated: [] };
  for (const file of commit.files) {
    const cls = ruleClass(file);
    if (cls !== undefined) deltas.classes.push(cls);
    const name = file.filename;
    const target = SKILL_FILE.test(name)
      ? { list: deltas.bullets, pattern: BULLET }
      : GUIDE_FILE.test(name)
        ? { list: deltas.guideIds, pattern: GUIDE_ID }
        : GUIDELINE_FILE.test(name)
          ? { list: deltas.headings, pattern: HEADING }
          : name === TEMPLATE_FILE
            ? { list: deltas.template, pattern: TEXT }
            : undefined;
    if (target === undefined) continue;
    if (file.patch === undefined) deltas.truncated.push(name);
    else target.list.push(...changedLines(name, file.patch, target.pattern));
  }
  return deltas;
}
