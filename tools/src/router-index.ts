// The index sw-skill-router ships with: every skill's contexts, tasks and
// routes in one JSON file, so the installed router needs neither this repo's
// tools nor the other skills' routes.json.
//
// Each skill states in its SKILL.md frontmatter where it applies:
//
//   metadata:
//     contexts: core plugin project   # the kinds of repository it is for
//     tasks: build review             # what the user is doing
//     load_for: review                # tasks it loads for with no file match
//     paths: "**/*.php"               # files that load it with no reference
//
// `node tools/bin/render-router-index.ts` writes the index; validate-skills
// fails when it is out of date or a skill's metadata is missing or unknown.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { frontmatter } from './skill-checks.ts';
import { BORROWED } from './route-borrow.ts';
import { loadRoutes } from './routes.ts';
import { compareText } from './text.ts';

export const ROUTER = 'sw-skill-router';
export const HELP = 'sw-help';
/** Skills about the library itself; the router never recommends them. */
export const META_SKILLS = new Set([ROUTER, HELP]);
export const INDEX_FILE = `skills/${ROUTER}/index.json`;
export const REPO = 'BrocksiNet/ai-skills-shopware';

export const CONTEXTS = ['core', 'plugin', 'app', 'project'] as const;
export const TASKS = ['build', 'review', 'ship', 'answer', 'run'] as const;

export interface SkillMetadata {
  contexts: string[];
  tasks: string[];
  load_for: string[];
  paths: string[];
}

/** The `metadata:` block of the frontmatter as key -> value. Values are
 *  plain or quoted strings, the shape the Agent Skills spec allows. */
export function metadataBlock(markdown: string): Map<string, string> {
  const lines = markdown.split('\n');
  const result = new Map<string, string>();
  if (lines[0] !== '---') return result;
  const end = lines.indexOf('---', 1);
  const fm = lines.slice(1, end === -1 ? undefined : end);
  const start = fm.indexOf('metadata:');
  if (start === -1) return result;
  for (const line of fm.slice(start + 1)) {
    const m = /^ {2}([A-Za-z0-9_-]+):\s*(.*)$/u.exec(line);
    if (m === null) break;
    const [, key = '', raw = ''] = m;
    result.set(key, raw.trim().replace(/^"(.*)"$/u, '$1'));
  }
  return result;
}

const words = (value: string | undefined): string[] => (value ?? '').split(/\s+/u).filter((w) => w !== '');

const known = (list: string[], allowed: readonly string[], key: string): string[] =>
  list.filter((v) => !allowed.includes(v)).map((v) => `metadata.${key}: unknown value '${v}'`);

/** The router metadata of a SKILL.md, and what is wrong with it. */
export function skillMetadata(markdown: string): { meta: SkillMetadata; errors: string[] } {
  const block = metadataBlock(markdown);
  const meta: SkillMetadata = {
    contexts: words(block.get('contexts')),
    tasks: words(block.get('tasks')),
    load_for: words(block.get('load_for')),
    paths: words(block.get('paths')),
  };
  const errors = [
    ...(meta.contexts.length === 0 ? [`metadata.contexts is missing (${CONTEXTS.join(' ')})`] : []),
    ...(meta.tasks.length === 0 ? [`metadata.tasks is missing (${TASKS.join(' ')})`] : []),
    ...known(meta.contexts, CONTEXTS, 'contexts'),
    ...known(meta.tasks, TASKS, 'tasks'),
    ...known(meta.load_for, meta.tasks, 'load_for (must be one of its tasks)'),
  ];
  return { meta, errors };
}

export interface IndexRoute {
  /** Path from the skills folder: `sw-testing/references/x.md`. */
  reference: string;
  when: string;
  paths_any?: string[];
  anchors_any?: string[];
  always?: boolean;
  on_demand?: boolean;
}

export interface IndexSkill extends SkillMetadata {
  name: string;
  summary: string;
  routes: IndexRoute[];
}

export interface RouterIndex {
  $comment: string;
  repo: string;
  contexts: readonly string[];
  tasks: readonly string[];
  skills: IndexSkill[];
}

/** The first sentence of a description: what the skill is for. */
export function summary(description: string): string {
  const m = /^(.+?[.!?])(?:\s|$)/u.exec(description);
  return (m?.[1] ?? description).trim();
}

/** `../sw-x/references/a.md` -> `sw-x/references/a.md`; own refs get the skill. */
function fromSkillsDir(skill: string, reference: string): string {
  const m = BORROWED.exec(reference);
  return m === null ? `${skill}/${reference}` : `${m[1] ?? ''}/${m[2] ?? ''}`;
}

function indexSkill(root: string, skill: string): IndexSkill {
  const dir = join(root, 'skills', skill);
  const text = readFileSync(join(dir, 'SKILL.md'), 'utf8');
  const { meta } = skillMetadata(text);
  const routes = (loadRoutes(dir)?.routes ?? []).map((r) => {
    const route: IndexRoute = { reference: fromSkillsDir(skill, r.reference), when: r.when };
    if (r.paths_any !== undefined) route.paths_any = r.paths_any;
    if (r.anchors_any !== undefined) route.anchors_any = r.anchors_any;
    if (r.always === true) route.always = true;
    if (r.on_demand === true) route.on_demand = true;
    return route;
  });
  return { name: skill, summary: summary(frontmatter(text).description), ...meta, routes };
}

export function skillNames(root: string): string[] {
  const dir = join(root, 'skills');
  return readdirSync(dir)
    .filter((s) => statSync(join(dir, s)).isDirectory() && existsSync(join(dir, s, 'SKILL.md')))
    .toSorted(compareText);
}

export function buildIndex(root: string): RouterIndex {
  return {
    $comment:
      'Generated by node tools/bin/render-router-index.ts from each SKILL.md metadata block and routes.json; do not edit.',
    repo: REPO,
    contexts: CONTEXTS,
    tasks: TASKS,
    skills: skillNames(root)
      .filter((s) => !META_SKILLS.has(s))
      .map((s) => indexSkill(root, s)),
  };
}

export const renderIndex = (index: RouterIndex): string => `${JSON.stringify(index, null, 2)}\n`;

/** Metadata errors of every skill, a stale index, and skills sw-help does
 *  not mention. Empty when the router and the help are in line. */
export function routerErrors(root: string): string[] {
  const skills = skillNames(root);
  const errors = skills.flatMap((s) =>
    skillMetadata(readFileSync(join(root, 'skills', s, 'SKILL.md'), 'utf8')).errors.map((e) => `${s}: ${e}`),
  );
  if (errors.length > 0) return errors;
  const path = join(root, INDEX_FILE);
  const current = existsSync(path) ? readFileSync(path, 'utf8') : '';
  if (current !== renderIndex(buildIndex(root))) {
    errors.push(`${INDEX_FILE} is out of date; run node tools/bin/render-router-index.ts`);
  }
  const helpPath = join(root, 'skills', HELP, 'SKILL.md');
  const help = existsSync(helpPath) ? readFileSync(helpPath, 'utf8') : '';
  for (const s of skills) {
    if (s !== HELP && !new RegExp(`\`${s}\``, 'u').test(help))
      errors.push(`${HELP}/SKILL.md does not mention \`${s}\``);
  }
  return errors;
}
