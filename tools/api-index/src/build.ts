// One snapshot of the public API at a ref of a shopware/shopware clone.
import { bundleConfigItems } from './bundle-config.ts';
import { type Constants, constantsOf } from './constants.ts';
import { definitionNames, entityItems } from './entities.ts';
import { type FieldClass, fieldClasses } from './field-classes.ts';
import { frontendItems } from './frontend.ts';
import { commitOf, listFiles, readFiles } from './git.ts';
import { markSchema, routeItems, SCHEMA_DIRS, schemaOperations } from './http.ts';
import { GENERATOR, type Item, SCHEMA, type Snapshot } from './model.ts';
import { phpItems } from './php.ts';
import { yamlSurfaces } from './yaml-surfaces.ts';

/** PHP under `src/`, without the test helpers each bundle ships. */
export function isPhpSource(path: string): boolean {
  return path.endsWith('.php') && !/\/(Test|Tests|test|tests)\//u.test(path);
}

export interface BuildOptions {
  repo: string;
  ref: string;
  now: () => Date;
}

/** The installers are applications of their own, not API an extension uses. */
const NOT_EXTENSION_API = /^src\/(WebInstaller|Core\/Installer)\//u;

/** Routes, entities and bundle configuration of the parsed PHP files, the
 *  OpenAPI marks on the routes, and the feature flags. */
function surfaceItems(
  options: BuildOptions,
  files: Map<string, string>,
  all: string[],
  constants: Constants,
  members: Map<string, Item>,
): { items: Item[]; unread: string[] } {
  const classes = new Map<string, FieldClass>();
  const definitions = new Map<string, string>();
  for (const [path, code] of files) {
    try {
      if (path.endsWith('Field.php')) for (const [name, entry] of fieldClasses(code, path)) classes.set(name, entry);
      if (code.includes('defineFields'))
        for (const [name, entity] of definitionNames(code, path, constants)) definitions.set(name, entity);
    } catch {
      // The PHP pass reports the file as failed.
    }
  }
  const items: Item[] = [];
  const unread: string[] = [];
  const routes: Item[] = [];
  for (const [path, code] of files) {
    try {
      if (code.includes('Route(') && !NOT_EXTENSION_API.test(path)) routes.push(...routeItems(code, path, constants));
      if (code.includes('defineFields')) {
        const result = entityItems(code, path, classes, definitions, members);
        items.push(...result.items);
        unread.push(...result.unreadable);
      }
      if (code.includes('ConfigurationInterface')) items.push(...bundleConfigItems(code, path));
    } catch {
      // The PHP pass reports the file as failed.
    }
  }
  const schemaFiles = all.filter((path) => path.endsWith('.json') && SCHEMA_DIRS.some(([dir]) => path.includes(dir)));
  const operations: string[] = [];
  for (const [path, json] of readFiles(options.repo, options.ref, schemaFiles)) {
    const prefix = SCHEMA_DIRS.find(([dir]) => path.includes(dir))?.[1] ?? '';
    try {
      operations.push(...schemaOperations(json, prefix));
    } catch {
      unread.push(`${path}: not JSON`);
    }
  }
  markSchema(routes, operations);
  // A cached decorator repeats the route attribute of the route it wraps.
  routes.sort((a, b) => Number(/\/Cached\w+\.php$/u.test(a.file)) - Number(/\/Cached\w+\.php$/u.test(b.file)));
  items.push(...routes);
  yamlSurfaces(options.repo, options.ref, items);
  return { items, unread };
}

export function buildSnapshot(options: BuildOptions): Snapshot {
  const all = listFiles(options.repo, options.ref, 'src');
  const paths = all.filter((path) => isPhpSource(path));
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
  const classFiles = new Map(
    items.filter((item) => !item.id.includes('::')).map((item) => [item.id.slice('php:'.length), item.file]),
  );
  const members = new Map(items.map((item) => [item.id, item]));
  const surfaces = surfaceItems(options, files, all, constantsOf(files, classFiles), members);
  items.push(...surfaces.items);
  const frontend = frontendItems(options.repo, options.ref, all, files);
  items.push(...frontend.items);
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
