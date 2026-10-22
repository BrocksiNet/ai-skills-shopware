// One snapshot of the public API at a ref of a shopware/shopware clone.
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

export function buildSnapshot(options: BuildOptions): Snapshot {
  const paths = listFiles(options.repo, options.ref, 'src').filter((path) => isPhpSource(path));
  const files = readFiles(options.repo, options.ref, paths);
  const items: Item[] = [];
  const failed: string[] = [];
  for (const [path, code] of files) {
    try {
      items.push(...phpItems(code, path));
    } catch {
      failed.push(path);
    }
  }
  // A class declared in both branches of an `if` is listed once, as the
  // first branch declares it.
  const unique = [...new Map(items.toReversed().map((item) => [item.id, item])).values()];
  unique.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return {
    schema: SCHEMA,
    generator: GENERATOR,
    ref: options.ref,
    sha: commitOf(options.repo, options.ref),
    builtAt: options.now().toISOString(),
    failed: failed.toSorted(),
    items: unique,
  };
}
