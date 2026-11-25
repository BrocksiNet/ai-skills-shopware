// One snapshot of the public API at a ref of a shopware/shopware clone.
import { backendItems } from './backend-surfaces.ts';
import { constantsOf } from './constants.ts';
import { frontendItems } from './frontend.ts';
import { commitOf, listFiles, readFiles } from './git.ts';
import { GENERATOR, type Item, SCHEMA, type Snapshot } from './model.ts';
import { phpItems } from './php.ts';

/** PHP under `src/`, without the test helpers each bundle ships. */
export function isPhpSource(path: string): boolean {
  return path.endsWith('.php') && !/\/(Test|Tests|test|tests)\//u.test(path);
}

export interface BuildOptions {
  repo: string;
  ref: string;
  now: () => Date;
}

/** Alias items whose previous name is still declared: that declaration wins. */
export function withoutDeclaredAliases(items: Item[]): Item[] {
  const declared = new Set(items.filter((item) => item.aliasOf === undefined).map((item) => item.id));
  return items.filter((item) => item.aliasOf === undefined || !declared.has(item.id));
}

export function buildSnapshot(options: BuildOptions): Snapshot {
  const all = listFiles(options.repo, options.ref, 'src');
  const paths = all.filter((path) => isPhpSource(path));
  const files = readFiles(options.repo, options.ref, paths);
  const parsed: Item[] = [];
  const failed: string[] = [];
  for (const [path, code] of files) {
    try {
      parsed.push(...phpItems(code, path));
    } catch {
      failed.push(path);
    }
  }
  const items = withoutDeclaredAliases(parsed);
  const classFiles = new Map(
    items.filter((item) => !item.id.includes('::')).map((item) => [item.id.slice('php:'.length), item.file]),
  );
  const members = new Map(items.map((item) => [item.id, item]));
  const surfaces = backendItems(options.repo, options.ref, files, all, constantsOf(files, classFiles), members);
  const frontend = frontendItems(options.repo, options.ref, all, files);
  items.push(...surfaces.items, ...frontend.items);
  // A class declared in both branches of an `if`, or a component core
  // registers twice, is listed once, as the first declares it.
  const unique = [...new Map(items.toReversed().map((item) => [item.id, item])).values()];
  unique.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return {
    schema: SCHEMA,
    generator: GENERATOR,
    ref: options.ref,
    sha: commitOf(options.repo, options.ref),
    builtAt: options.now().toISOString(),
    failed: failed.toSorted(),
    unread: [...surfaces.unread, ...frontend.unread].toSorted(),
    items: unique,
  };
}
