// Backend surfaces extracted from PHP, OpenAPI schemas, and YAML:
// routes, entities, bundle config, MCP extension points, and feature flags.
import { bundleConfigItems } from './bundle-config.ts';
import type { Constants } from './constants.ts';
import { definitionNames, entityItems } from './entities.ts';
import { type FieldClass, fieldClasses } from './field-classes.ts';
import { readFiles } from './git.ts';
import { markSchema, routeItems, SCHEMA_DIRS, schemaOperations } from './http.ts';
import { mcpItems } from './mcp.ts';
import type { Item } from './model.ts';
import { yamlSurfaces } from './yaml-surfaces.ts';

/** The installers are applications of their own, not API an extension uses. */
const NOT_EXTENSION_API = /^src\/(WebInstaller|Core\/Installer)\//u;

/** Routes, entities, bundle config, MCP extension points, OpenAPI marks, and feature flags. */
export function backendItems(
  repo: string,
  ref: string,
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
  for (const [path, json] of readFiles(repo, ref, schemaFiles)) {
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
  items.push(...routes, ...mcpItems(files));
  yamlSurfaces(repo, ref, items);
  return { items, unread };
}
