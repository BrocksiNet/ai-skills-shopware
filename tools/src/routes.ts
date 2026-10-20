// Path-based reference routing (plan WP4).
//
// skills/<skill>/routes.json says which reference to read for a change:
// `when` is the task in words, `paths_any` are globs on the changed files,
// `anchors_any` are regexes on added and removed lines. Any hit selects the
// reference. The table between the routes markers in SKILL.md is generated
// from the same file, so the model and the router see one source.
//
// Two kinds of route have no diff signal. `always` routes load whenever the
// skill is active (a skill's single procedure reference). `on_demand` routes
// depend on the task, not the diff (an approach keeps failing, a fix grows
// beyond the bug); the router never selects them and the model decides from
// `when`. Both are reported apart from the diff-selected references.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, matchesGlob } from 'node:path';

export interface Route {
  /** Skill-relative path, e.g. `references/migrations.md`. */
  reference: string;
  /** The task in words; the "When" column of the table. */
  when: string;
  paths_any?: string[];
  anchors_any?: string[];
  /** Loaded whenever the skill is active; not a diff signal. */
  always?: boolean;
  /** Picked by the task, not the diff: the router never selects it. */
  on_demand?: boolean;
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

/** True when the diff triggers the route. `always` and `on_demand` routes have
 *  no diff signal and never match; see `fixedReferences`. */
export function routeMatches(route: Route, files: ChangedFile[]): boolean {
  if (route.always || route.on_demand) return false;
  const paths = route.paths_any ?? [];
  const anchors = (route.anchors_any ?? []).map((a) => new RegExp(a));
  return files.some(
    (f) => paths.some((g) => matchesGlob(f.path, g)) || anchors.some((re) => f.lines.some((l) => re.test(l))),
  );
}

const unique = (refs: string[]): string[] => [...new Set(refs)];

/** References the diff selects, in routes.json order, without duplicates. */
export function selectReferences(routes: RouteFile, files: ChangedFile[]): string[] {
  return unique(routes.routes.filter((r) => routeMatches(r, files)).map((r) => r.reference));
}

/** References of one kind that do not depend on the diff. */
export function fixedReferences(routes: RouteFile, kind: 'always' | 'on_demand'): string[] {
  return unique(routes.routes.filter((r) => r[kind] === true).map((r) => r.reference));
}

export function loadRoutes(skillDir: string): RouteFile | null {
  const path = join(skillDir, ROUTES_FILE);
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as RouteFile) : null;
}

export interface RouteReport {
  /** skill -> references the diff selects. The routing cases test this. */
  selected: Record<string, string[]>;
  /** skill -> references loaded whenever the skill is active. */
  always: Record<string, string[]>;
  /** skill -> references the task decides on; the diff cannot. */
  on_demand: Record<string, string[]>;
}

/** What each skill with a routes.json loads for a diff; skills with no
 *  reference of a kind are left out of that kind. */
export function routeDiff(root: string, diff: string): RouteReport {
  const files = parseDiff(diff);
  const report: RouteReport = { selected: {}, always: {}, on_demand: {} };
  for (const skill of readdirSync(join(root, 'skills')).sort()) {
    const routes = loadRoutes(join(root, 'skills', skill));
    if (routes === null) continue;
    const kinds: [keyof RouteReport, string[]][] = [
      ['selected', selectReferences(routes, files)],
      ['always', fixedReferences(routes, 'always')],
      ['on_demand', fixedReferences(routes, 'on_demand')],
    ];
    for (const [kind, refs] of kinds) if (refs.length > 0) report[kind][skill] = refs;
  }
  return report;
}

// ---- rendering ---------------------------------------------------------------

const cell = (text: string): string => text.replace(/\|/g, '\\|');
/** `**\/Migration/Migration*.php` -> `Migration/Migration*.php`; `updateDestructive\(` -> `updateDestructive(`. */
const showGlob = (g: string): string => g.replace(/^(\*\*\/)+/, '');
const showAnchor = (a: string): string => a.replace(/\\([^A-Za-z0-9])/g, '$1');

/** The table shows a hint of what a row covers, not every trigger: the full
 *  lists stay in routes.json for the router and CI. */
export const SHOWN_GLOBS = 2;
export const SHOWN_ANCHORS = 1;

function triggers(route: Route): string {
  if (route.always) return 'any change';
  if (route.on_demand) return 'on demand';
  const globs = unique((route.paths_any ?? []).map(showGlob));
  const anchors = unique((route.anchors_any ?? []).map(showAnchor));
  const shown = [...globs.slice(0, SHOWN_GLOBS), ...anchors.slice(0, SHOWN_ANCHORS)].map((s) => `\`${cell(s)}\``);
  if (globs.length > SHOWN_GLOBS || anchors.length > SHOWN_ANCHORS) shown.push('…');
  return shown.join(', ');
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
    if (r.on_demand !== undefined && typeof r.on_demand !== 'boolean') errors.push(`${here}.on_demand must be true or false`);
    const hasTriggers = Boolean(r.paths_any?.length || r.anchors_any?.length);
    const kinds = [hasTriggers, r.always === true, r.on_demand === true].filter(Boolean).length;
    if (kinds === 0) errors.push(`${here}: needs paths_any, anchors_any, always or on_demand`);
    if (kinds > 1) errors.push(`${here}: use triggers, always or on_demand, not more than one`);
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
