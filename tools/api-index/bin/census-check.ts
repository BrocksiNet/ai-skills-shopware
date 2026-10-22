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
import { isPhpSource } from '../src/build.ts';
import { GENERATOR, type Item } from '../src/model.ts';
import { isNode } from '../src/node.ts';
import { defaultCacheDir, loadSnapshot, readJson } from '../src/store.ts';

const CLASS_KINDS = new Set(['class', 'interface', 'trait', 'enum']);

function records(value: unknown, key: string): Record<string, unknown>[] {
  if (!isNode(value)) return [];
  const list = value[key];
  return Array.isArray(list) ? list.filter((entry) => isNode(entry)) : [];
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
  const snapshotDir = join(values.cache ?? defaultCacheDir(process.env), GENERATOR.replaceAll(/[^\w.-]+/gu, '_'));
  const files = existsSync(snapshotDir) ? readdirSync(snapshotDir).filter((name) => name.startsWith('v')) : [];
  let mismatched = 0;
  let checked = 0;
  for (const file of files.toSorted()) {
    const snapshot = loadSnapshot(join(snapshotDir, file));
    if (snapshot === undefined) continue;
    const dir = join(values.census, 'refs', snapshot.ref, 'raw');
    if (!existsSync(join(dir, 'classes.json.gz'))) continue;
    checked += 1;
    const classes = censusClasses(dir);
    const ours = new Set(snapshot.items.filter((item) => CLASS_KINDS.has(item.kind)).map((item) => item.id.slice(4)));
    const onlyCensus = [...classes].filter((name) => !ours.has(name));
    const onlyOurs = [...ours].filter((name) => !classes.has(name));
    const units = censusMethods(dir);
    const missingMethods = snapshot.items
      .filter((item) => item.kind === 'method' && item.abstract !== true)
      .filter((item) => !units.has(methodKey(item)));
    // Interface methods have no body; the index does not mark them abstract.
    const interfaces = new Set(snapshot.items.filter((item) => item.kind === 'interface').map((item) => item.id));
    const realMissing = missingMethods.filter((item) => !interfaces.has(item.id.replace(/::\w+\(\)$/u, '')));
    const ok = onlyCensus.length === 0 && onlyOurs.length === 0 && realMissing.length === 0;
    if (!ok) mismatched += 1;
    process.stdout.write(
      `${ok ? 'ok  ' : 'DIFF'} ${snapshot.ref}: classes ${ours.size} vs ${classes.size}` +
        ` (only census ${onlyCensus.length}, only index ${onlyOurs.length}),` +
        ` methods with a body missing in census ${realMissing.length}\n`,
    );
    for (const name of onlyCensus.slice(0, details)) process.stdout.write(`  only census: ${name}\n`);
    for (const name of onlyOurs.slice(0, details)) process.stdout.write(`  only index: ${name}\n`);
    for (const item of realMissing.slice(0, details))
      process.stdout.write(`  method not in census: ${item.id} (${item.file})\n`);
  }
  process.stdout.write(`${checked} tags checked, ${mismatched} with differences\n`);
  return mismatched > 0 ? 1 : 0;
}

process.exitCode = main();
