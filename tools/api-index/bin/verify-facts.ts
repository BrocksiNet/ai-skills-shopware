// Phase 1 measurement: checks the facts of bin/facts.ts --json against the
// source of shopware/shopware, without php-parser or the index. It reads the
// declaration and its docblock with git grep and regular expressions at the
// first and last release of each fact, and checks that the fact does not
// hold in the releases just outside it.
//
//   node tools/api-index/bin/verify-facts.ts --repo ~/shopware --index api-index.json.gz report.json…
//
// Prints one line per fact: `ok`, `WRONG` with the release that disagrees,
// or `manual` when the declaration is not found by text (inherited members).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { isNode } from '../src/node.ts';
import { loadTimeline } from '../src/store.ts';

interface Fact {
  target: string;
  kind: string;
  releases: [string, string][];
  value?: string;
  via?: string;
}

function isFact(value: unknown): value is Fact {
  return (
    isNode(value) && typeof value.target === 'string' && typeof value.kind === 'string' && Array.isArray(value.releases)
  );
}

const files = new Map<string, string | undefined>();

function show(repo: string, tag: string, path: string): string {
  return execFileSync('git', ['-C', repo, 'show', `${tag}:${path}`], { maxBuffer: 1 << 26 }).toString();
}

/** The source of the file that declares `fqcn` at `tag`, found by text. */
function classSource(repo: string, tag: string, fqcn: string): string | undefined {
  const key = `${tag}\0${fqcn}`;
  if (files.has(key)) return files.get(key);
  const parts = fqcn.split('\\');
  const short = parts.pop() ?? '';
  const namespace = parts.join('\\');
  let out: string | undefined;
  try {
    const hits = execFileSync(
      'git',
      [
        '-C',
        repo,
        'grep',
        '-l',
        '-P',
        `^\\s*((abstract|final|readonly) )*(class|interface|trait|enum) ${short}\\b`,
        tag,
        '--',
        'src',
      ],
      { maxBuffer: 1 << 26 },
    )
      .toString()
      .split('\n')
      .filter((line) => line !== '' && !/\/(Test|Tests|test|tests)\//u.test(line))
      .map((line) => line.slice(tag.length + 1));
    for (const path of hits) {
      const code = show(repo, tag, path);
      if (new RegExp(`^namespace ${namespace.replaceAll('\\', '\\\\')};`, 'mu').test(code)) {
        out = code;
        break;
      }
    }
  } catch {
    out = undefined;
  }
  files.set(key, out);
  return out;
}

/** The comment and attribute lines right above the line that matches `declaration`. */
function preamble(code: string, declaration: RegExp): string | undefined {
  const lines = code.split('\n');
  const at = lines.findIndex((line) => declaration.test(line));
  if (at === -1) return undefined;
  const out: string[] = [];
  let inDoc = false;
  for (let index = at - 1; index >= 0; index -= 1) {
    const line = (lines[index] ?? '').trim();
    if (line.endsWith('*/')) inDoc = true;
    if (inDoc || line.startsWith('#[') || line.startsWith(')]') || line.startsWith('*') || line === '') {
      if (line === '' && !inDoc && out.length > 0) break;
      out.push(line);
      if (line.startsWith('/**') || line.startsWith('/*')) inDoc = false;
      continue;
    }
    if (/^[\w\\]+\(|^\w+:|^['"\]]/u.test(line)) {
      // a multi-line attribute's arguments
      out.push(line);
      continue;
    }
    break;
  }
  return out.toReversed().join('\n');
}

function memberDeclaration(member: string): RegExp {
  if (member.endsWith('()')) return new RegExp(`function &?${member.slice(0, -2)}\\s*\\(`, 'iu');
  if (member.startsWith('$')) return new RegExp(`\\$${member.slice(1)}\\b\\s*[;=,)]`, 'u');
  return new RegExp(`(const\\s+(\\w+\\s+)?${member}\\b|case\\s+${member}\\b)`, 'u');
}

function classDeclaration(short: string): RegExp {
  return new RegExp(`^\\s*((abstract|final|readonly) )*(class|interface|trait|enum) ${short}\\b`, 'u');
}

type Probe = boolean | undefined;

/** Does the fact hold at one release? undefined when text cannot tell. */
function holds(repo: string, tag: string, fact: Fact): Probe {
  const [owner = '', member] = fact.target.replace(/^php:/u, '').split('::');
  const code = classSource(repo, tag, owner);
  const short = owner.split('\\').pop() ?? '';
  if (fact.kind === 'missing') {
    if (code === undefined) return true;
    if (member === undefined) return false;
    return memberDeclaration(member).test(code) ? false : undefined;
  }
  if (code === undefined) return false;
  // A member that is gone carries no flag; one that is not declared here may be inherited.
  if (member !== undefined && fact.via === undefined && !memberDeclaration(member).test(code)) return undefined;
  if (member !== undefined && fact.via?.split('::').length === 1 && !memberDeclaration(member).test(code)) {
    return false;
  }
  const [carrierOwner = owner, carrierMember] = (fact.via ?? fact.target).replace(/^php:/u, '').split('::');
  const carrierCode = carrierOwner === owner ? code : classSource(repo, tag, carrierOwner);
  if (carrierCode === undefined) return undefined;
  const declaration =
    carrierMember === undefined
      ? classDeclaration(carrierOwner.split('\\').pop() ?? '')
      : memberDeclaration(carrierMember);
  const doc = preamble(carrierCode, declaration);
  if (doc === undefined) return undefined;
  switch (fact.kind) {
    case 'internal':
      return /@internal\b/u.test(doc);
    case 'deprecated':
      return /@deprecated\b/u.test(doc) && (fact.value === undefined || doc.includes(`tag:${fact.value}`));
    case 'experimental':
      return /@experimental\b/u.test(doc);
    case 'bc-change': {
      // `NewOptionalParameter@v6.8.0` → `#[NewOptionalParameter(version: 'v6.8.0'…`
      const [name = '', version = ''] = (fact.value ?? '').split(', ')[0]?.split('@') ?? [];
      return new RegExp(`#\\[(.*\\\\)?${name}\\(`, 'u').test(doc) && doc.includes(version);
    }
    case 'final-extended': {
      const line = code.split('\n').find((text) => classDeclaration(short).test(text)) ?? '';
      return /\bfinal\b/u.test(line) || /@final\b/u.test(preamble(code, classDeclaration(short)) ?? '');
    }
    default:
      return undefined;
  }
}

interface Report {
  path: string;
  releases: string[];
  facts: Fact[];
  symbols: string[];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function readReport(path: string): Report | undefined {
  const report: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!isNode(report) || !Array.isArray(report.facts) || !Array.isArray(report.releases)) return undefined;
  return {
    path: path.split('/').pop() ?? path,
    releases: strings(report.releases),
    facts: report.facts.filter((entry) => isFact(entry)),
    symbols: strings(report.symbols),
  };
}

type RefOf = (release: string) => string;

/** Problems with one fact at its edges: the first and last release must
 *  hold it, the releases just outside must not. */
function checkFact(repo: string, refOf: RefOf, range: string[], fact: Fact): { problems: string[]; unsure: boolean } {
  const problems: string[] = [];
  let unsure = false;
  const inFact = (release: string): boolean => fact.releases.some(([a, b]) => a === release || b === release);
  for (const [first, last] of fact.releases) {
    const probes: [string | undefined, boolean][] = [
      [first, true],
      [last, true],
      [range[range.indexOf(first) - 1], false],
      [range[range.indexOf(last) + 1], false],
    ];
    for (const [release, expected] of probes.filter(([at, want]) => at !== undefined && inFact(at) === want)) {
      const result = holds(repo, refOf(release ?? ''), fact);
      if (result === undefined) unsure = true;
      else if (result !== expected) problems.push(`${release ?? ''}: ${expected ? 'does not hold' : 'holds too'}`);
    }
  }
  return { problems, unsure };
}

/** Precision: every fact, checked by text. Returns the number that are wrong. */
function precision(repo: string, refOf: RefOf, reports: Report[]): number {
  const totals = { ok: 0, wrong: 0, manual: 0 };
  for (const report of reports) {
    for (const fact of report.facts.filter((entry) => entry.kind !== 'unknown')) {
      const { problems, unsure } = checkFact(repo, refOf, report.releases, fact);
      const label = problems.length > 0 ? 'WRONG ' : unsure ? 'manual' : 'ok    ';
      if (problems.length > 0) totals.wrong += 1;
      else if (unsure) totals.manual += 1;
      else totals.ok += 1;
      const value = fact.value === undefined ? '' : ` ${fact.value}`;
      const via = fact.via === undefined ? '' : ` via ${fact.via.replace(/^php:/u, '')}`;
      const why = problems.length > 0 ? ` (${problems.join('; ')})` : '';
      process.stdout.write(
        `${label} ${report.path} ${fact.kind}${value} ${fact.target.replace(/^php:/u, '')}${via}${why}\n`,
      );
    }
  }
  process.stdout.write(`ok ${totals.ok}, wrong ${totals.wrong}, manual ${totals.manual}\n`);
  return totals.wrong;
}

/** Does a fact of the report cover a class flag at this release? */
function covered(report: Report, target: string, kind: string, release: string): boolean {
  const at = report.releases.indexOf(release);
  return report.facts.some(
    (fact) =>
      fact.target === target &&
      fact.kind === kind &&
      fact.via === undefined &&
      fact.releases.some(
        ([first, last]) => report.releases.indexOf(first) <= at && at <= report.releases.indexOf(last),
      ),
  );
}

/** Recall: every class the extension refers to, read by text at the first and
 *  last release of its range. A flag in the source without a fact is a miss. */
function recall(repo: string, refOf: RefOf, reports: Report[]): number {
  let probes = 0;
  let missed = 0;
  let flagged = 0;
  for (const report of reports) {
    const edges = [report.releases[0], report.releases.at(-1)].filter((release) => release !== undefined);
    const classes = report.symbols.filter((symbol) => !symbol.includes('::'));
    const checks = classes.flatMap((target) =>
      edges.flatMap((release) => ['internal', 'deprecated', 'experimental'].map((kind) => ({ target, release, kind }))),
    );
    for (const { target, release, kind } of checks) {
      probes += 1;
      if (holds(repo, refOf(release), { target, kind, releases: [] }) !== true) continue;
      flagged += 1;
      if (covered(report, target, kind, release)) continue;
      missed += 1;
      process.stdout.write(`MISSED ${report.path} ${kind} ${target.replace(/^php:/u, '')} at ${release}\n`);
    }
  }
  process.stdout.write(
    `recall: ${probes} class flag probes, ${flagged} flags found in the source, ${missed} of them without a fact\n`,
  );
  return missed;
}

function main(): number {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { repo: { type: 'string' }, index: { type: 'string' } },
  });
  if (values.repo === undefined || values.index === undefined || positionals.length === 0) {
    process.stderr.write('usage: verify-facts.ts --repo <shopware clone> --index <api-index.json.gz> report.json…\n');
    return 2;
  }
  const timeline = loadTimeline(values.index);
  const refs = new Map(timeline.releases.map((release) => [release.release, release.ref]));
  const refOf: RefOf = (release) => refs.get(release) ?? `v${release}`;
  const reports = positionals.map((path) => readReport(path)).filter((report) => report !== undefined);
  const wrong = precision(values.repo, refOf, reports);
  const missed = recall(values.repo, refOf, reports);
  return wrong > 0 || missed > 0 ? 1 : 0;
}

process.exitCode = main();
