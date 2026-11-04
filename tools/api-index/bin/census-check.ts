// Cross-checks cached snapshots against the codebase census
// (shopwareLabs/codebase-census, private) for every tag both have.
//
//   node tools/api-index/bin/census-check.ts --census ~/codebase-census-data [--cache <dir>] [--details 5]
//
// Classes must match both ways. Methods: every method the index lists with
// a body must be a census unit; census units the index lacks are private
// methods, which the index leaves out on purpose, so they are not counted.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { errorMessage } from '../../src/errors.ts';
import { isPhpSource } from '../src/build.ts';
import { GENERATOR, type Item, type Snapshot } from '../src/model.ts';
import { isNode } from '../src/node.ts';
import { defaultCacheDir, loadSnapshot, readJson } from '../src/store.ts';

const CLASS_KINDS = new Set(['class', 'interface', 'trait', 'enum']);

function records(value: unknown, key: string): Record<string, unknown>[] {
  const list = isNode(value) ? value[key] : undefined;
  if (!Array.isArray(list) || !list.every((entry) => isNode(entry)))
    throw new Error(`${key} must be a list of census records`);
  return list;
}

function stringField(entry: Record<string, unknown>, key: string): string {
  const value = entry[key];
  return typeof value === 'string' ? value : '';
}

/** Census classes in the paths the index reads. */
function censusClasses(dir: string): Set<string> {
  const out = new Set<string>();
  for (const entry of records(readJson(join(dir, 'classes.json.gz')), 'classes')) {
    const path = stringField(entry, 'path');
    if (path.startsWith('src/') && isPhpSource(path) && CLASS_KINDS.has(stringField(entry, 'kind'))) {
      out.add(stringField(entry, 'name'));
    }
  }
  return out;
}

/** Census methods as `path|Short::method`, lower-cased like PHP names. */
function censusMethods(dir: string): Set<string> {
  const out = new Set<string>();
  for (const entry of records(readJson(join(dir, 'units.json.gz')), 'units')) {
    if (stringField(entry, 'kind') !== 'method' || stringField(entry, 'language') !== 'php') continue;
    out.add(`${stringField(entry, 'path')}|${stringField(entry, 'name')}`.toLowerCase());
  }
  return out;
}

/** `php:A\B\C::run()` → `path|C::run`. */
function methodKey(item: Item): string {
  const match = /^php:(?:.*\\)?([^\\]+)::(\w+)\(\)$/u.exec(item.id);
  return `${item.file}|${match?.[1] ?? ''}::${match?.[2] ?? ''}`.toLowerCase();
}

interface Comparison {
  classCount: number;
  censusCount: number;
  onlyCensus: string[];
  onlyOurs: string[];
  missing: Item[];
  ok: boolean;
}

function compare(snapshot: Snapshot, dir: string): Comparison {
  const classes = censusClasses(dir);
  const ours = new Set(snapshot.items.filter((item) => CLASS_KINDS.has(item.kind)).map((item) => item.id.slice(4)));
  const onlyCensus = [...classes].filter((name) => !ours.has(name));
  const onlyOurs = [...ours].filter((name) => !classes.has(name));
  const units = censusMethods(dir);
  const interfaces = new Set(snapshot.items.filter((item) => item.kind === 'interface').map((item) => item.id));
  const missing = snapshot.items
    .filter((item) => item.kind === 'method' && item.abstract !== true)
    .filter((item) => !units.has(methodKey(item)))
    .filter((item) => !interfaces.has(item.id.replace(/::\w+\(\)$/u, '')));
  return {
    classCount: ours.size,
    censusCount: classes.size,
    onlyCensus,
    onlyOurs,
    missing,
    ok: onlyCensus.length === 0 && onlyOurs.length === 0 && missing.length === 0,
  };
}

function printComparison(ref: string, result: Comparison, details: number): void {
  process.stdout.write(
    `${result.ok ? 'ok  ' : 'DIFF'} ${ref}: classes ${result.classCount} vs ${result.censusCount}` +
      ` (only census ${result.onlyCensus.length}, only index ${result.onlyOurs.length}),` +
      ` methods with a body missing in census ${result.missing.length}\n`,
  );
  for (const name of result.onlyCensus.slice(0, details)) process.stdout.write(`  only census: ${name}\n`);
  for (const name of result.onlyOurs.slice(0, details)) process.stdout.write(`  only index: ${name}\n`);
  for (const item of result.missing.slice(0, details))
    process.stdout.write(`  method not in census: ${item.id} (${item.file})\n`);
}

function main(): number {
  const { values } = parseArgs({
    options: {
      census: { type: 'string' },
      cache: { type: 'string' },
      details: { type: 'string', default: '5' },
    },
  });
  if (values.census === undefined) {
    process.stderr.write('usage: census-check.ts --census <codebase-census-data> [--cache <dir>] [--details <n>]\n');
    return 2;
  }
  const details = Number(values.details);
  if (values.details.trim() === '' || !Number.isSafeInteger(details) || details < 0)
    throw new Error('--details must be a non-negative integer');
  const snapshotDir = join(values.cache ?? defaultCacheDir(process.env), GENERATOR.replaceAll(/[^\w.-]+/gu, '_'));
  const files = existsSync(snapshotDir) ? readdirSync(snapshotDir).filter((name) => name.startsWith('v')) : [];
  let mismatched = 0;
  let checked = 0;
  for (const file of files.toSorted()) {
    const snapshot = loadSnapshot(join(snapshotDir, file));
    if (snapshot === undefined) throw new Error(`${file}: not an API snapshot`);
    if (snapshot.failed.length > 0) throw new Error(`${snapshot.ref}: snapshot has parse failures`);
    const dir = join(values.census, 'refs', snapshot.ref, 'raw');
    if (!existsSync(join(dir, 'classes.json.gz'))) continue;
    checked++;
    const result = compare(snapshot, dir);
    if (!result.ok) mismatched++;
    printComparison(snapshot.ref, result, details);
  }
  if (checked === 0) throw new Error('no comparable cache/census tags found');
  process.stdout.write(`${checked} tags checked, ${mismatched} with differences\n`);
  return mismatched > 0 ? 1 : 0;
}

try {
  process.exitCode = main();
} catch (error) {
  process.stderr.write(`census-check: ${errorMessage(error)}\n`);
  process.exitCode = 2;
}
