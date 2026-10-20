// Path-based reference routing (plan WP4).
//
// skills/<skill>/routes.json says which reference to read for a change:
// `when` is the task in words, `paths_any` are globs on the changed files,
// `anchors_any` are regexes on added and removed lines. Any hit selects the
// reference. The table between the routes markers in SKILL.md is generated
// from the same file, so the model and the router see one source.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, matchesGlob } from 'node:path';

export interface Route {
  /** Skill-relative path, e.g. `references/migrations.md`. */
  reference: string;
  /** The task in words; the "When" column of the table. */
  when: string;
  paths_any?: string[];
  anchors_any?: string[];
  /** Selected for every change the skill sees. */
  always?: boolean;
}

export interface RouteFile {
  $comment?: string;
  routes: Route[];
}

export const ROUTES_FILE = 'routes.json';
export const START = '<!-- routes:start: generated from routes.json by `node tools/bin/render-routes.ts`; do not edit -->';
export const END = '<!-- routes:end -->';

/** One file of a unified diff. */
export interface ChangedFile {
  path: string;
  /** Added and removed lines, without the +/- marker. */
  lines: string[];
}

export function parseDiff(diff: string): ChangedFile[] {
  const files: ChangedFile[] = [];
  let current: ChangedFile | null = null;
  let oldPath = '';
  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git ')) {
      current = null;
      continue;
    }
    if (line.startsWith('--- ')) {
      oldPath = line.slice(4).replace(/^a\//, '').trim();
      continue;
    }
    if (line.startsWith('+++ ')) {
      const newPath = line.slice(4).replace(/^b\//, '').trim();
      current = { path: newPath === '/dev/null' ? oldPath : newPath, lines: [] };
      files.push(current);
      continue;
    }
    if (current !== null && (line.startsWith('+') || line.startsWith('-'))) current.lines.push(line.slice(1));
  }
  return files;
}

export function routeMatches(route: Route, files: ChangedFile[]): boolean {
  if (route.always) return true;
  const paths = route.paths_any ?? [];
  const anchors = (route.anchors_any ?? []).map((a) => new RegExp(a));
  return files.some(
    (f) => paths.some((g) => matchesGlob(f.path, g)) || anchors.some((re) => f.lines.some((l) => re.test(l))),
  );
}

/** References selected for a diff, in routes.json order, without duplicates. */
export function selectReferences(routes: RouteFile, files: ChangedFile[]): string[] {
  const out: string[] = [];
  for (const r of routes.routes) if (routeMatches(r, files) && !out.includes(r.reference)) out.push(r.reference);
  return out;
}

export function loadRoutes(skillDir: string): RouteFile | null {
  const path = join(skillDir, ROUTES_FILE);
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as RouteFile) : null;
}

/** skill name -> selected references, for every skill with routes.json. */
export function routeDiff(root: string, diff: string): Record<string, string[]> {
  const files = parseDiff(diff);
  const out: Record<string, string[]> = {};
  for (const skill of readdirSync(join(root, 'skills')).sort()) {
    const routes = loadRoutes(join(root, 'skills', skill));
    if (routes === null) continue;
    const refs = selectReferences(routes, files);
    if (refs.length > 0) out[skill] = refs;
  }
  return out;
}

// ---- rendering ---------------------------------------------------------------

const cell = (text: string): string => text.replace(/\|/g, '\\|');
/** `**\/Migration/Migration*.php` -> `Migration/Migration*.php`; `updateDestructive\(` -> `updateDestructive(`. */
const showGlob = (g: string): string => g.replace(/^(\*\*\/)+/, '');
const showAnchor = (a: string): string => a.replace(/\\([^A-Za-z0-9])/g, '$1');

function triggers(route: Route): string {
  if (route.always) return 'any change';
  const shown = [...(route.paths_any ?? []).map(showGlob), ...(route.anchors_any ?? []).map(showAnchor)];
  return [...new Set(shown)].map((s) => `\`${cell(s)}\``).join(', ');
}

export function renderTable(routes: RouteFile): string {
  const rows = routes.routes.map((r) => {
    const name = r.reference.replace(/^references\//, '');
    return `| [\`${name}\`](${r.reference}) | ${cell(r.when)} | ${triggers(r)} |`;
  });
  return [START, '| Read | When | Or the change touches |', '| ---- | ---- | --------------------- |', ...rows, END].join('\n');
}

/** SKILL.md with the table brought in line with routes.json. Throws when the
 *  markers are missing or unbalanced: the author decides where it goes. */
export function applyTable(text: string, routes: RouteFile): string {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.startsWith('<!-- routes:start'));
  const end = lines.findIndex((l) => l === END);
  if (start === -1 || end === -1 || end < start) throw new Error('missing or unbalanced routes:start / routes:end markers');
  return [...lines.slice(0, start), ...renderTable(routes).split('\n'), ...lines.slice(end + 1)].join('\n');
}

// ---- validation ----------------------------------------------------------------

const isString = (v: unknown): v is string => typeof v === 'string' && v !== '';
const isStringList = (v: unknown): v is string[] => Array.isArray(v) && v.every(isString);

/** Errors for one skill's routes.json and its rendered table. */
export function routeErrors(skillDir: string, label: string): string[] {
  let routes: RouteFile | null;
  try {
    routes = loadRoutes(skillDir);
  } catch (e) {
    return [`${label}/${ROUTES_FILE}: ${(e as Error).message}`];
  }
  if (routes === null) return [];
  const errors: string[] = [];
  const at = `${label}/${ROUTES_FILE}`;
  if (!Array.isArray(routes.routes) || routes.routes.length === 0) return [`${at}: routes must be a non-empty list`];
  routes.routes.forEach((r, i) => {
    const here = `${at}: routes[${i}]`;
    if (!isString(r.reference)) errors.push(`${here}.reference must be a string`);
    else if (!existsSync(join(skillDir, r.reference))) errors.push(`${here}: ${r.reference} not found`);
    if (!isString(r.when)) errors.push(`${here}.when must be a non-empty string`);
    if (r.paths_any !== undefined && !isStringList(r.paths_any)) errors.push(`${here}.paths_any must be a list of globs`);
    if (r.anchors_any !== undefined && !isStringList(r.anchors_any)) errors.push(`${here}.anchors_any must be a list of regexes`);
    for (const a of isStringList(r.anchors_any) ? r.anchors_any : []) {
      try {
        new RegExp(a);
      } catch {
        errors.push(`${here}: bad regex ${a}`);
      }
    }
    if (r.always !== undefined && typeof r.always !== 'boolean') errors.push(`${here}.always must be true or false`);
    if (!r.always && !(r.paths_any?.length || r.anchors_any?.length)) {
      errors.push(`${here}: needs paths_any, anchors_any or always`);
    }
  });
  if (errors.length > 0) return errors;

  const refsDir = join(skillDir, 'references');
  const routed = new Set(routes.routes.map((r) => r.reference));
  if (existsSync(refsDir)) {
    for (const f of readdirSync(refsDir).sort()) {
      // The WP3 overflow list is linked from its own section.
      if (f.endsWith('.md') && f !== 'enforced-by-ci.md' && !routed.has(`references/${f}`)) {
        errors.push(`${at}: references/${f} has no route`);
      }
    }
  }
  const skillMd = join(skillDir, 'SKILL.md');
  const text = readFileSync(skillMd, 'utf8');
  try {
    if (applyTable(text, routes) !== text) errors.push(`${label}/SKILL.md: routes table is out of date; run node tools/bin/render-routes.ts`);
  } catch (e) {
    errors.push(`${label}/SKILL.md: ${(e as Error).message}`);
  }
  return errors;
}
