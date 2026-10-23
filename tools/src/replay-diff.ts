// PR diffs for the route replay (route-replay.ts): built from the GitHub
// files API, and trimmed for the committed corpus.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, matchesGlob } from 'node:path';
import { parseDiff } from './diff.ts';

/** One entry of `GET /repos/{repo}/pulls/{n}/files` or of a compare. */
export interface PrFile {
  filename: string;
  previous_filename?: string;
  status: string;
  patch?: string;
}

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

export function isPrFile(v: unknown): v is PrFile {
  return (
    isRecord(v) &&
    typeof v.filename === 'string' &&
    typeof v.status === 'string' &&
    (v.patch === undefined || typeof v.patch === 'string') &&
    (v.previous_filename === undefined || typeof v.previous_filename === 'string')
  );
}

/** A unified diff from the files API. Unlike the `.diff` media type it works
 *  for PRs of any size; a file without `patch` (binary, too large) keeps its
 *  headers, so path routes still see it. */
export function filesToDiff(files: PrFile[]): string {
  return files
    .map((f) => {
      const old = f.previous_filename ?? f.filename;
      const renamed = f.status === 'renamed' ? [`rename from ${old}`, `rename to ${f.filename}`] : [];
      return [
        `diff --git a/${old} b/${f.filename}`,
        ...renamed,
        f.status === 'added' ? '--- /dev/null' : `--- a/${old}`,
        f.status === 'removed' ? '+++ /dev/null' : `+++ b/${f.filename}`,
        ...(f.patch === undefined ? [] : [f.patch]),
      ].join('\n');
    })
    .join('\n')
    .concat('\n');
}

/** Every anchor regex of every skill's routes: what trimming keeps. */
export function allAnchors(root: string): RegExp[] {
  const patterns = new Set<string>();
  for (const skill of readdirSync(join(root, 'skills'))) {
    const path = join(root, 'skills', skill, 'routes.json');
    if (!existsSync(path)) continue;
    const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
    const routes = isRecord(value) && Array.isArray(value.routes) ? value.routes : [];
    for (const r of routes) {
      const anchors = isRecord(r) && Array.isArray(r.anchors_any) ? r.anchors_any : [];
      for (const a of anchors) if (typeof a === 'string') patterns.add(a);
    }
  }
  return [...patterns].map((p) => new RegExp(p, 'u'));
}

/** Changed lines kept per file besides the anchor hits, so a new anchor
 *  still has some real code to run on. */
export const SPARE_LINES = 12;
/** Longest spare line kept; longer lines are generated or minified. */
const MAX_LINE = 400;

/** The diff cut down for the committed corpus: every file header, every
 *  changed line an anchor matches, and up to `spare` other changed lines per
 *  file, under one `@@` per file. Context lines go, the router ignores
 *  them. The router selects the same references on the trimmed diff. */
export function trimDiff(diff: string, anchors: RegExp[], spare = SPARE_LINES): string {
  const out: string[] = [];
  let kept = 0;
  let inHunk = false;
  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git ')) {
      [kept, inHunk] = [0, false];
      out.push(line);
    } else if (!inHunk && /^(rename from|rename to|--- |\+\+\+ )/u.test(line)) {
      out.push(line);
    } else if (line.startsWith('@@')) {
      if (!inHunk) out.push('@@ @@');
      inHunk = true;
    } else if (inHunk && (line.startsWith('+') || line.startsWith('-'))) {
      const hit = anchors.some((re) => re.test(line.slice(1)));
      if (hit || (kept < spare && line.length <= MAX_LINE)) out.push(line);
      if (!hit) kept += 1;
    }
  }
  return `${out.join('\n')}\n`;
}

/** Test code: what the test-shape route is about. */
const TEST_GLOBS = ['**/tests/**', '**/Test/**', '**/*Test.php', '**/*.spec.js', '**/*.spec.ts'];

export const touchesTests = (diff: string): boolean =>
  parseDiff(diff).some((f) => TEST_GLOBS.some((g) => matchesGlob(f.path, g)));
