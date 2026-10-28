#!/usr/bin/env node
// Which Shopware skills and references a change or a task needs.
//
//   node route.mjs                       # git diff of this branch against its base
//   node route.mjs --base origin/6.6.x   # against another base
//   node route.mjs --diff pr.patch       # a saved diff ("-" reads stdin)
//   node route.mjs --paths src/A.php src/Resources/config/services.xml
//   node route.mjs --list                # every skill, installed or not
//
//   --task build|review|ship|answer|run  what the user is doing (default: any)
//   --context core|plugin|app|project    override the detected repository kind
//   --skills-dir <dir>                   another folder with installed skills
//   --json                               machine-readable output
//
// Plain Node, no dependencies: it runs wherever the skill is installed. The
// data comes from index.json next to this folder, which the skills library
// generates from every skill's metadata and routes.json.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = resolve(HERE, '..');
const INDEX = JSON.parse(readFileSync(join(SKILL_DIR, 'index.json'), 'utf8'));
const BASES = ['origin/trunk', 'origin/main', 'origin/master', 'trunk', 'main', 'master'];

// ---- arguments -----------------------------------------------------------------

export function parseArgs(argv) {
  const o = { task: 'any', context: 'auto', paths: null, diff: null, base: null, root: null, json: false, list: false, skillsDirs: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => {
      i += 1;
      if (argv[i] === undefined) throw new Error(`${a} needs a value`);
      return argv[i];
    };
    if (a === '--task') o.task = next();
    else if (a === '--context') o.context = next();
    else if (a === '--diff') o.diff = next();
    else if (a === '--base') o.base = next();
    else if (a === '--root') o.root = next();
    else if (a === '--skills-dir') o.skillsDirs.push(next());
    else if (a === '--json') o.json = true;
    else if (a === '--list') o.list = true;
    else if (a === '--paths') {
      o.paths = [];
      while (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) o.paths.push(argv[(i += 1)]);
    } else if (a === '--help' || a === '-h') o.help = true;
    else throw new Error(`unknown argument ${a}`);
  }
  if (o.task !== 'any' && !INDEX.tasks.includes(o.task)) throw new Error(`--task must be one of ${INDEX.tasks.join(', ')}`);
  if (o.context !== 'auto' && o.context !== 'any' && !INDEX.contexts.includes(o.context)) {
    throw new Error(`--context must be one of ${INDEX.contexts.join(', ')}`);
  }
  return o;
}

const LARGE_DIFF = 50;
const MANY_COMMITS = 30;

// ---- changes -------------------------------------------------------------------

function git(root, args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 256 * 1024 * 1024 });
  } catch {
    return null;
  }
}

/** Added and removed lines per file of a unified diff. A renamed or moved
 *  file is listed under both paths, the old one without lines. `---` and
 *  `+++` are headers only before a file's first hunk, so a removed SQL
 *  comment is a line. Mirrors parseDiff in tools/src/routes.ts. */
export function parseDiff(diff) {
  const files = [];
  let current = null;
  let oldPath = '';
  let inHunk = false;
  const add = (path) => {
    const found = files.find((f) => f.path === path);
    if (found !== undefined) return found;
    const file = { path, lines: [] };
    files.push(file);
    return file;
  };
  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git ')) [current, oldPath, inHunk] = [null, '', false];
    else if (!inHunk && line.startsWith('rename from ')) oldPath = line.slice('rename from '.length).trim();
    else if (!inHunk && line.startsWith('rename to ')) {
      add(oldPath);
      current = add(line.slice('rename to '.length).trim());
    } else if (!inHunk && line.startsWith('--- ')) {
      const path = line.slice(4).replace(/^a\//u, '').trim();
      if (path !== '/dev/null') oldPath = path;
    } else if (!inHunk && line.startsWith('+++ ')) {
      const path = line.slice(4).replace(/^b\//u, '').trim();
      if (path !== '/dev/null' && oldPath !== '' && path !== oldPath) add(oldPath);
      current = add(path === '/dev/null' ? oldPath : path);
    } else if (line.startsWith('@@')) inHunk = true;
    else if (current !== null && inHunk && (line.startsWith('+') || line.startsWith('-'))) current.lines.push(line.slice(1));
  }
  return files;
}

/** An untracked file is all added lines; skip big or binary files. */
function newFileLines(path) {
  try {
    if (statSync(path).size > 512 * 1024) return [];
    const text = readFileSync(path, 'utf8');
    return text.includes('\u0000') ? [] : text.split('\n');
  } catch {
    return [];
  }
}

function defaultBase(root) {
  const head = git(root, ['rev-parse', '--abbrev-ref', 'origin/HEAD'])?.trim();
  const candidates = head ? [head, ...BASES] : BASES;
  return candidates.find((b) => git(root, ['rev-parse', '--verify', '--quiet', `${b}^{commit}`]) !== null) ?? null;
}

/** The changed files and where they came from. */
function collectChanges(o, root) {
  if (o.diff !== null) {
    const text = readFileSync(o.diff === '-' ? 0 : o.diff, 'utf8');
    return { files: parseDiff(text), source: o.diff === '-' ? 'diff on stdin' : `diff ${o.diff}` };
  }
  if (o.paths !== null) return { files: o.paths.map((p) => ({ path: p.replace(/^\.\//u, ''), lines: [] })), source: 'planned paths' };
  if (git(root, ['rev-parse', '--is-inside-work-tree']) === null) return { files: [], source: 'no git repository' };
  const base = o.base ?? defaultBase(root);
  const from = base === null ? 'HEAD' : (git(root, ['merge-base', 'HEAD', base])?.trim() ?? base);
  const files = parseDiff(git(root, ['diff', '-M', from]) ?? '');
  const seen = new Set(files.map((f) => f.path));
  for (const p of (git(root, ['ls-files', '--others', '--exclude-standard']) ?? '').split('\n')) {
    if (p !== '' && !seen.has(p)) files.push({ path: p, lines: newFileLines(join(root, p)) });
  }
  if (base === null) return { files, source: 'uncommitted changes' };
  const commits = Number(git(root, ['rev-list', '--count', `${from}..HEAD`])?.trim() ?? '0');
  const short = from.slice(0, 10);
  return { files, source: `git diff against ${base} (merge base ${short}, ${commits} commit(s) on this branch), plus uncommitted and untracked files`, base: { ref: base, merge_base: from, commits } };
}

// ---- globs ---------------------------------------------------------------------

function expandBraces(glob) {
  const m = /\{([^{}]*)\}/u.exec(glob);
  if (m === null) return [glob];
  return m[1].split(',').flatMap((alt) => expandBraces(glob.slice(0, m.index) + alt + glob.slice(m.index + m[0].length)));
}

const escape = (s) => s.replace(/[.+^$()|[\]\\]/gu, '\\$&');

function segmentRegex(seg) {
  const body = escape(seg).replaceAll('*', '[^/]*').replaceAll('?', '[^/]');
  // Like node:path matchesGlob: a wildcard never matches a leading dot.
  return seg.startsWith('.') ? body : `(?!\\.)${body}`;
}

function globRegex(glob) {
  const segs = glob.split('/');
  let out = '';
  segs.forEach((seg, i) => {
    const last = i === segs.length - 1;
    if (seg === '**') out += last ? '(?!\\.)[^/]+(?:/(?!\\.)[^/]+)*' : '(?:(?!\\.)[^/]+/)*';
    else out += segmentRegex(seg) + (last ? '' : '/');
  });
  return new RegExp(`^${out}$`, 'u');
}

const globCache = new Map();
/** The same answers as node:path matchesGlob for the globs routes use. */
export function matchesGlob(path, glob) {
  if (!globCache.has(glob)) globCache.set(glob, expandBraces(glob).map(globRegex));
  return globCache.get(glob).some((re) => re.test(path));
}

// ---- context -------------------------------------------------------------------

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/** What kind of Shopware repository the root is, and why. */
export function detectContext(root) {
  const composer = readJson(join(root, 'composer.json')) ?? {};
  const requires = { ...(composer.require ?? {}), ...(composer['require-dev'] ?? {}) };
  if (['shopware/shopware', 'shopware/platform'].includes(composer.name) || existsSync(join(root, 'src/Core/Kernel.php'))) {
    return { kind: 'core', reason: 'shopware/shopware checkout' };
  }
  if (composer.type === 'shopware-platform-plugin') return { kind: 'plugin', reason: 'composer.json type shopware-platform-plugin' };
  if (existsSync(join(root, 'manifest.xml'))) return { kind: 'app', reason: 'manifest.xml at the root' };
  if ('shopware/core' in requires || existsSync(join(root, 'custom/plugins')) || existsSync(join(root, '.shopware-project.yml'))) {
    return { kind: 'project', reason: 'shop project (requires shopware/core or has custom/plugins)' };
  }
  return { kind: 'any', reason: 'no Shopware repository detected, so no context filter' };
}

/** The context of one changed file: plugins and apps inside a project count as such. */
export function fileContext(path, kind) {
  if (kind !== 'project') return kind;
  if (/^(?:custom\/(?:static-)?plugins|vendor\/store\.shopware\.com)\/[^/]+\//u.test(path)) return 'plugin';
  if (/^custom\/apps\/[^/]+\//u.test(path)) return 'app';
  return 'project';
}

const fits = (list, value) => value === 'any' || list.includes(value);

// ---- installed skills ----------------------------------------------------------

function skillDirs(o, root) {
  const dirs = [
    resolve(SKILL_DIR, '..'),
    ...o.skillsDirs.map((d) => resolve(d)),
    ...['.claude/skills', '.agents/skills', '.cursor/skills', '.codex/skills'].flatMap((d) => [join(root, d), join(homedir(), d)]),
  ];
  return [...new Set(dirs)].filter((d) => existsSync(d));
}

/** skill name -> folder it is installed in. */
function installedSkills(dirs) {
  const found = new Map();
  for (const dir of dirs) {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (!found.has(name) && statSync(path).isDirectory() && existsSync(join(path, 'SKILL.md'))) found.set(name, path);
    }
  }
  return found;
}

/** Core trunk ships its own skills; ours are an overlay there. */
function coreSkills(root) {
  const dir = join(root, '.agents/skills');
  if (!existsSync(dir)) return [];
  // Core uses the sw- prefix too (sw-review, sw-triage), so compare names.
  const ours = new Set([...INDEX.skills.map((s) => s.name), 'sw-skill-router', 'sw-help']);
  return readdirSync(dir).filter((n) => !ours.has(n) && existsSync(join(dir, n, 'SKILL.md')));
}

// ---- routing -------------------------------------------------------------------

const TESTISH = ['**/tests/**', '**/Test/**', '**/*.test.{js,ts}', '**/*.spec.{js,ts}', '**/*.md'];

/** Why a route fires, or null: every file it matches, counted, and the best
 *  reason to show. A path match in production code beats one in a test or
 *  a doc, and a path match beats a changed line. */
function routeHit(route, files) {
  const excluded = route.exclude_paths ?? [];
  const reasons = [];
  for (const f of files) {
    if (excluded.some((g) => matchesGlob(f.path, g))) continue;
    const testish = TESTISH.some((g) => matchesGlob(f.path, g));
    const glob = (route.paths_any ?? []).find((g) => matchesGlob(f.path, g));
    if (glob !== undefined) {
      reasons.push({ rank: testish ? 2 : 0, text: `${f.path} matches \`${glob}\`` });
      continue;
    }
    const anchor = (route.anchors_any ?? []).find((a) => f.lines.some((l) => new RegExp(a, 'u').test(l)));
    if (anchor !== undefined) reasons.push({ rank: testish ? 3 : 1, text: `a changed line in ${f.path} matches \`${anchor}\`` });
  }
  if (reasons.length === 0) return null;
  const best = reasons.reduce((a, b) => (b.rank < a.rank ? b : a));
  return { why: reasons.length > 1 ? `${best.text}, and ${reasons.length - 1} more file(s)` : best.text, hits: reasons.length };
}

/** The recommendation for one set of changes, context and task. */
export function route({ files, kind, task }) {
  const withContext = files.map((f) => ({ ...f, context: fileContext(f.path, kind) }));
  const contexts = [...new Set(withContext.map((f) => f.context))];
  const load = [];
  const other = [];
  const skipped = [];
  for (const skill of INDEX.skills) {
    const inContext = withContext.filter((f) => fits(skill.contexts, f.context));
    const contextOk = files.length === 0 ? fits(skill.contexts, kind) : inContext.length > 0;
    const taskOk = fits(skill.tasks, task);
    const references = [];
    for (const r of skill.routes) {
      const hit = routeHit(r, inContext);
      if (hit !== null) references.push({ reference: r.reference, ...hit });
    }
    references.sort((a, b) => b.hits - a.hits);
    const why = [];
    const pathHit = skill.paths.map((g) => inContext.find((f) => matchesGlob(f.path, g))).find(Boolean);
    if (pathHit !== undefined) why.push(`${pathHit.path} matches \`${skill.paths.find((g) => matchesGlob(pathHit.path, g))}\``);
    if (task !== 'any' && skill.load_for.includes(task)) why.push(`loads for every ${task} task`);
    if (references.length > 0) why.push(`${references.length} reference(s) matched`);
    if (!contextOk || !taskOk) {
      const raw = files.flatMap((f) => skill.routes.filter((r) => routeHit(r, [f]) !== null));
      if (raw.length > 0) skipped.push({ name: skill.name, reason: !contextOk ? `for ${skill.contexts.join(', ')} only` : `not for ${task}` });
      continue;
    }
    const entry = {
      name: skill.name,
      summary: skill.summary,
      why,
      hits: references.reduce((n, r) => n + r.hits, 0),
      defers_to: skill.defers_to ?? [],
      references,
      always: skill.routes.filter((r) => r.always).map((r) => r.reference),
      on_demand: skill.routes.filter((r) => r.on_demand).map((r) => ({ reference: r.reference, when: r.when })),
    };
    (why.length > 0 ? load : other).push(entry);
  }
  load.sort((a, b) => b.hits - a.hits);
  return { contexts, load, other, skipped };
}

// ---- output --------------------------------------------------------------------

/** A reference relative to the skill it is printed under: `references/a.md`
 *  for its own, `../sw-y/references/a.md` for one it borrows. */
function inSkill(skill, reference) {
  const [owner, ...rest] = reference.split('/');
  return owner === skill ? rest.join('/') : `../${reference}`;
}

function markdown(r, installed) {
  const out = [];
  const contexts = r.contexts.length > 0 ? r.contexts.join(', ') : r.context.kind;
  out.push('# Shopware skills for this work', '');
  out.push(`- Context: ${contexts} (${r.context.reason})`, `- Task: ${r.task}`, `- Changes: ${r.changes} file(s) from ${r.source}`, '');
  if (r.load.length > 0) {
    out.push('## Load these skills', '');
    for (const s of r.load) {
      const dir = installed.get(s.name);
      out.push(`- **${s.name}**${dir === undefined ? ' (not installed)' : `: ${join(dir, 'SKILL.md')}`}`);
      for (const w of s.why.filter((x) => !x.endsWith('matched'))) out.push(`  - because ${w}`);
      for (const ref of s.references) out.push(`  - read ${inSkill(s.name, ref.reference)}, because ${ref.why}`);
      const lead = s.defers_to.filter((n) => r.core.includes(n));
      if (lead.length > 0) out.push(`  - core leads here: read ${lead.map((n) => `.agents/skills/${n}`).join(' and ')} first`);
      for (const ref of s.always) out.push(`  - read ${inSkill(s.name, ref)}, every time this skill loads`);
      for (const ref of s.on_demand) out.push(`  - on demand: ${inSkill(s.name, ref.reference)}, when ${ref.when.replace(/^\w/u, (c) => c.toLowerCase())}`);
    }
    out.push('');
  } else {
    out.push('No file and no task selected a skill. Pick from the list below by what the user asked for.', '');
  }
  if (r.other.length > 0) {
    out.push('## Also fits this context and task', '', 'Load one only when the request is about it.', '');
    for (const s of r.other) out.push(`- **${s.name}**: ${s.summary}`);
    out.push('');
  }
  if (r.skipped.length > 0) {
    out.push('## Matched files but skipped', '');
    for (const s of r.skipped) out.push(`- ${s.name}: ${s.reason}`);
    out.push('');
  }
  if (r.missing.length > 0) {
    out.push('## Recommended but not installed', '', '```bash');
    out.push(`npx skills add ${INDEX.repo} ${r.missing.map((m) => `--skill ${m}`).join(' ')}`, '```', '');
  }
  for (const n of r.notes) out.push(`Note: ${n}`);
  return `${out.join('\n').trimEnd()}\n`;
}

function list(installed) {
  const out = ['# Shopware skills', '', '| Skill | Installed | Contexts | Tasks | What it is for |', '| ----- | --------- | -------- | ----- | -------------- |'];
  for (const s of INDEX.skills) {
    out.push(`| ${s.name} | ${installed.has(s.name) ? 'yes' : 'no'} | ${s.contexts.join(', ')} | ${s.tasks.join(', ')} | ${s.summary.replaceAll('|', '\\|')} |`);
  }
  return `${out.join('\n')}\n`;
}

export function main(argv) {
  const o = parseArgs(argv);
  if (o.help) {
    process.stdout.write(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 17).map((l) => l.replace(/^\/\/ ?/u, '')).join('\n') + '\n');
    return 0;
  }
  const root = resolve(o.root ?? git(process.cwd(), ['rev-parse', '--show-toplevel'])?.trim() ?? process.cwd());
  const installed = installedSkills(skillDirs(o, root));
  if (o.list) {
    process.stdout.write(o.json ? `${JSON.stringify(INDEX.skills.map((s) => ({ ...s, installed: installed.has(s.name) })), null, 2)}\n` : list(installed));
    return 0;
  }
  const detected = detectContext(root);
  const context = o.context === 'auto' ? detected : { kind: o.context, reason: 'set with --context' };
  const { files, source, base } = collectChanges(o, root);
  const result = route({ files, kind: context.kind, task: o.task });
  const notes = [];
  const core = coreSkills(root);
  if (context.kind === 'core' && core.length > 0) {
    notes.push(`this checkout ships ${core.length} core skills in .agents/skills. Use them for platform work; the sw- skills are an overlay.`);
  }
  if (files.length > LARGE_DIFF) {
    notes.push(`${files.length} changed files is a lot for one change. If the base is stale, run git fetch, or pass --base <ref> or --diff.`);
  }
  if (base !== undefined && base.commits > MANY_COMMITS) {
    notes.push(`${base.commits} commits since ${base.ref}. For a stacked pull request, pass its parent branch: --base <parent-branch>.`);
  }
  if (o.task === 'any') notes.push('no --task given. Pass build, review, ship, answer or run to load the skills of that task too.');
  const report = { context, task: o.task, source, base: base ?? null, changes: files.length, core: context.kind === 'core' ? core : [], ...result, notes };
  report.missing = result.load.map((s) => s.name).filter((n) => !installed.has(n));
  process.stdout.write(o.json ? `${JSON.stringify(report, null, 2)}\n` : markdown(report, installed));
  return 0;
}

// Compare real paths: installed skills are often symlinks (.claude/skills ->
// a release folder), and import.meta.url is always the resolved file.
const startedAs = (p) => {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
};
if (process.argv[1] !== undefined && startedAs(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`route.mjs: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  }
}
